import { sendAiChatRequest } from 'src/api/ai';
import { sendHttp } from 'src/api/network';
import i18n from 'src/i18n';
import { AIProvider, HttpRequest, TestOptions, TestResult, TestStatus } from 'src/types';
import { tryParseJsonObject } from 'src/utils';
import { notify } from 'src/utils/toast';
import {
  BaseTests,
  createErrorTestResult,
  createTestResult,
  determineRequestParameterTestStatus,
  determineTestStatus,
  SUCCESS_RESPONSE_EXPECTED,
} from '.';

const SYSTEM_PROMPT = [
  'You are the Deep AI Testing layer in Rentgen. Analyze the supplied request, field mappings and complete test report, then propose additional executable tests that fill coverage gaps.',
  '',
  'Rules:',
  '- Only propose tests that are missing from the executed set. Never repeat or trivially vary an executed test; a new value for an already tested parameter qualifies only if it probes a materially different validation rule, boundary or failure mode.',
  '- Prefer breadth across untested parameters over many variations of one parameter.',
  '- Use field mappings as declared expectations. Treat tool errors and unexecuted manual checks as untested, not as API failures.',
  '- Rank tests by value, highest first. Return fewer than 10 (or none) if no meaningful gaps remain.',
  '- "expected" is the intended status class: "2xx" for a valid value, "4xx" for an invalid/malformed/non-existent one.',
  '- Return only JSON matching the supplied response schema.',
].join('\n');

const RESPONSE_FORMAT: Record<string, unknown> = {
  type: 'json_schema',
  json_schema: {
    name: 'rentgen_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['tests'],
      properties: {
        tests: {
          type: 'array',
          description:
            'Up to ten additional test cases that are currently MISSING from the executed test set, ranked by priority (highest value first). Each test must cover a gap - a parameter, value class, boundary, format or error path that has not been exercised yet. Do not repeat, rephrase or trivially vary any already executed test: a different value for the same parameter only qualifies if it probes a materially different behaviour (e.g. a different validation rule, boundary or failure mode). Prefer breadth of coverage across untested parameters over many variations of one parameter, and return fewer than ten items - or an empty array - if no further meaningful gaps exist.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'expected', 'value', 'request'],
            properties: {
              name: {
                type: 'string',
                description:
                  "Identifier of the parameter under test, prefixed by its location: use 'body.' when the parameter is sent in the request body, or 'query.' when it is sent as a query-string parameter, followed by the parameter name exactly as the API expects it. Use dot notation for nested body fields and '[]' for array elements. Examples: 'body.customerId', 'body.address.zipCode', 'body.filters[0]', 'query.page'.",
              },
              expected: {
                type: 'string',
                enum: ['2xx', '4xx'],
                description:
                  "The HTTP status class this test is designed to produce. Only '2xx' or '4xx' are allowed. '2xx' means the supplied value is valid and the request should succeed. '4xx' is NOT a failing test - it is the intended outcome for invalid, malformed, unauthorized, or non-existent values; if the actual response is e.g. 400, 404 or 422, the test has passed. A test fails only when the actual status class differs from this expected class.",
              },
              value: {
                type: ['string', 'number', 'boolean', 'object', 'array', 'null'],
                description:
                  "The concrete value to send for the parameter named in 'name'. It may be any JSON type (string, number, boolean, object, array or null) matching how the parameter is transmitted. For 'expected': '2xx' supply a realistic, valid value; for 'expected': '4xx' supply the value that should trigger the error - e.g. a wrong type, out-of-range number, malformed format, empty string, null, or a syntactically valid but non-existent identifier.",
              },
              request: {
                type: 'object',
                additionalProperties: false,
                required: ['method', 'url', 'headers', 'body'],
                properties: {
                  method: {
                    type: 'string',
                    description: "HTTP method, uppercase (e.g. 'GET', 'POST', 'PUT', 'PATCH', 'DELETE').",
                  },
                  url: {
                    type: 'string',
                    description: 'Complete request URL, including query parameters.',
                  },
                  headers: {
                    type: 'object',
                    description:
                      'HTTP headers as a flat map of header name to header value. Both keys and values must be strings, e.g. {"Content-Type": "application/json", "Authorization": "Bearer <token>"}. Use an empty object when no headers are needed.',
                    additionalProperties: { type: 'string' },
                  },
                  body: {
                    type: ['string', 'null'],
                    description: 'Exact raw request body to send. Null means no body.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export class AiTests extends BaseTests {
  constructor(
    private testResults: TestResult[],
    private aiProvider: AIProvider,
    protected options: TestOptions,
    protected onTestStart?: () => void,
  ) {
    super(options, onTestStart);

    this.testResults = testResults;
    this.aiProvider = aiProvider;
  }

  public async run(): Promise<TestResult[]> {
    const { bodyParameters, queryParameters } = this.options;
    const { apiKey, baseUrl, model, path } = this.aiProvider;
    const response = await sendAiChatRequest(
      { apiKey, baseUrl, model, path },
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            report: this.testResults,
            fieldMappings: { body: bodyParameters, query: queryParameters },
          }),
        },
      ],
      RESPONSE_FORMAT,
    );

    if (!response?.ok) {
      notify.error(response.error, { toastId: 'error-generate-tests' });
      return [];
    }

    const aiTests: TestResult[] = (tryParseJsonObject(response.content)?.tests ?? []).map(
      ({ name, expected, value, request }: { name: string; expected: string; value: string; request: HttpRequest }) => {
        request.body = tryParseJsonObject(request?.body);

        return createTestResult(name, expected, '', TestStatus.Manual, request, null, value);
      },
    );
    if (aiTests.length === 0) {
      notify.error(i18n.t('ai.noTestsGenerated'), { toastId: 'error-generate-tests' });
      return [];
    }

    return aiTests;
  }
}

export async function runAiTest(options: TestOptions, test: TestResult): Promise<TestResult> {
  const { headers, method, url } = options;
  const { name, expected, request, value } = test;
  const modifiedRequest: HttpRequest = {
    ...(request ?? {}),
    headers: { ...headers },
    method,
    url,
  };

  try {
    const response = await sendHttp(modifiedRequest);
    const { actual, status } = determineTestStatus(response, (response, statusCode) =>
      determineRequestParameterTestStatus(response, statusCode, {
        valid: expected === SUCCESS_RESPONSE_EXPECTED,
        value,
      }),
    );

    return createTestResult(name, expected, actual, status, modifiedRequest, response, value);
  } catch (error) {
    return createErrorTestResult(name, expected, String(error), modifiedRequest, value);
  }
}
