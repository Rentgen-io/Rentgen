import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendAiChatRequest } from 'src/api/ai';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Toggle from 'src/components/inputs/Toggle';
import Loader from 'src/components/loaders/Loader';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectBodyParameters,
  selectDataDrivenTests,
  selectQueryParameters,
  selectSelectedRequestId,
  selectTestOptions,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import { createTestResult, SENSITIVE_HEADERS } from 'src/test-engine';
import { HttpBody, HttpRequest, TestOptions, TestResult, TestStatus } from 'src/types';
import {
  convertFormEntriesToUrlEncoded,
  convertUrlEncodedToFormEntries,
  extractPropertiesFromJson,
  extractQueryParameters,
  isObject,
  isUrlEncodedContentType,
  setDeepObjectProperty,
  tryParseJsonObject,
  updateFormEntry,
} from 'src/utils';
import { notify } from 'src/utils/toast';

const URL_FIELD = 'URL';
const BODY_PREFIX = 'body.';
const HEADER_PREFIX = 'header.';
const QUERY_PREFIX = 'query.';

const PREVIEW_EDITOR_OPTIONS = { folding: false, lineNumbers: 'off' } as const;

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

interface Props {
  onCancel?(): void;
}

export function AiRequestMaskControls({ onCancel }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const testOptions = useAppSelector(selectTestOptions);
  const dataDrivenTests = useAppSelector(selectDataDrivenTests);
  const bodyMappings = useAppSelector(selectBodyParameters);
  const queryMappings = useAppSelector(selectQueryParameters);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [masked, setMasked] = useState<Set<string>>(() => getSuggestedMasks(testOptions?.headers));

  const requestFields = useMemo(() => getRequestFields(testOptions), [testOptions]);
  const sanitizedRequest = useMemo(
    () => ({
      url: buildSanitizedUrl(testOptions, masked),
      headers: buildSanitizedHeaders(testOptions, masked),
      body: buildSanitizedBody(testOptions, masked),
    }),
    [masked, testOptions],
  );

  const toggleMask = useCallback((name: string) => {
    setMasked((previousMasked) => {
      const nextMasked = new Set(previousMasked);
      if (!nextMasked.delete(name)) nextMasked.add(name);

      return nextMasked;
    });
  }, []);

  const generateTests = useCallback(async () => {
    if (!activeAiProvider || isGenerating) return;

    setIsGenerating(true);

    const { baseUrl, model, apiKey } = activeAiProvider;
    const response = await sendAiChatRequest(
      { baseUrl, model, apiKey },
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            report: dataDrivenTests,
            fieldMappings: { body: bodyMappings, query: queryMappings },
          }),
        },
      ],
      RESPONSE_FORMAT,
    );

    setIsGenerating(false);

    if (!response?.ok) {
      notify.error(response.error, { toastId: 'error-generate-tests' });
      return;
    }

    const aiTests: TestResult[] = (tryParseJsonObject(response.content)?.tests ?? []).map(
      ({ name, expected, value, request }: { name: string; expected: string; value: string; request: HttpRequest }) =>
        createTestResult(name, expected, '', TestStatus.Manual, request, null, value),
    );
    if (aiTests.length === 0) {
      notify.error('No tests were generated by the AI.', { toastId: 'error-generate-tests' });
      return;
    }

    dispatch(testsActions.setAiTests(aiTests));
    if (selectedRequestId) dispatch(testsActions.addAiTestResults({ requestId: selectedRequestId, results: aiTests }));
  }, [activeAiProvider, bodyMappings, dataDrivenTests, isGenerating, queryMappings, selectedRequestId]);

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-4">
        <div className="flex-auto">
          <h5 className="m-0 mb-1">Review data sent to AI</h5>
          <p className="m-0 text-xs text-text-secondary">
            Select values to mask. Automatic suggestions are already selected.
          </p>
        </div>
        <div className="text-xs">
          {activeAiProvider?.name} · {activeAiProvider?.model}
        </div>
      </div>
      <div className="flex flex-col @2xl:flex-row border border-border dark:border-dark-body divide-y @2xl:divide-y-0 @2xl:divide-x divide-border dark:divide-dark-body">
        <div className="flex-1">
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 bg-body dark:bg-dark-body text-sm font-bold truncate">
            Request fields
            <span className="font-normal text-xs text-text-secondary truncate">{masked.size} masked</span>
          </label>
          <div className="flex border-t border-border dark:border-dark-body flex-col gap-4 p-4">
            {requestFields.map(([name, value]) => (
              <div key={name} className="flex items-center gap-4 text-xs">
                <Toggle checked={masked.has(name)} onChange={() => toggleMask(name)} />
                <span className="flex-1 min-w-36 font-monospace text-[#a31515] dark:text-[#9cdcfe] truncate">
                  {name}
                </span>
                <span className="flex-3 font-monospace text-[#0451a5] dark:text-[#ce9178] truncate">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 bg-body dark:bg-dark-body text-sm font-bold truncate">
            Sanitized preview<span className="font-normal text-xs text-text-secondary truncate">Ready to send</span>
          </label>
          <div className="flex flex-col gap-4 border-t border-border dark:border-dark-body p-4">
            {([sanitizedRequest.url, sanitizedRequest.headers, sanitizedRequest.body] as const).map((source, index) => {
              if (!source) return null;

              return <JsonViewer key={index} minHeight={0} options={PREVIEW_EDITOR_OPTIONS} source={source} />;
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-col @xl:flex-row @xl:justify-end gap-4 @xl:gap-2">
        <Button buttonType={ButtonType.SECONDARY} disabled={isGenerating} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          className="min-w-43 flex justify-center items-center"
          disabled={isGenerating || !activeAiProvider}
          onClick={generateTests}
        >
          {isGenerating ? (
            <Loader className="h-4 w-4 p-px [&>span]:border-2!" mode="dark" />
          ) : (
            'Generate Additional Tests'
          )}
        </Button>
      </div>
    </div>
  );
}

function createRedactionToken(name: string): string {
  return `{{REDACTED_${name.toUpperCase()}}}`;
}

function getMaskedNames(masked: Set<string>, prefix: string): string[] {
  return Array.from(masked)
    .filter((name) => name.startsWith(prefix))
    .map((name) => name.slice(prefix.length));
}

function getValueAtPath(source: unknown, path: string): unknown {
  return path
    .replace(/\[(\d+)]/g, '.$1')
    .split('.')
    .reduce<unknown>((value, key) => (isObject(value) ? value[key] : undefined), source);
}

function getBodyFields(body: HttpBody, headers: Record<string, string>): Array<[string, unknown]> {
  if (!body) return [];

  if (isUrlEncodedContentType(headers))
    return convertUrlEncodedToFormEntries(String(body)).map(([name, value]) => [`${BODY_PREFIX}${name}`, value]);

  if (!isObject(body)) return [];

  return Object.entries(extractPropertiesFromJson(body))
    .filter(([, type]) => type !== 'DO_NOT_TEST')
    .map(([path]) => [`${BODY_PREFIX}${path}`, getValueAtPath(body, path)]);
}

function getQueryFields(url: string): Array<[string, unknown]> {
  return Object.entries(extractQueryParameters(url)).map(([name, value]) => [`${QUERY_PREFIX}${name}`, value]);
}

function getSuggestedMasks(headers: Record<string, string> | undefined): Set<string> {
  return new Set(
    Object.keys(headers ?? {})
      .filter((name) => SENSITIVE_HEADERS.has(name.toLowerCase()))
      .map((name) => `${HEADER_PREFIX}${name}`),
  );
}

function getRequestFields(testOptions: TestOptions | null): Array<[string, unknown]> {
  if (!testOptions) return [];

  const { body, headers, url } = testOptions;

  return [
    [URL_FIELD, url],
    ...Object.entries(headers).map(([name, value]): [string, unknown] => [`${HEADER_PREFIX}${name}`, value]),
    ...getBodyFields(body, headers),
    ...getQueryFields(url),
  ];
}

function buildSanitizedUrl(testOptions: TestOptions | null, masked: Set<string>): string {
  if (!testOptions) return '';

  const { url, method } = testOptions;
  if (!url) return '';
  if (masked.has(URL_FIELD)) return `${method} ${createRedactionToken(URL_FIELD)}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return `${method} ${url}`;
  }

  const query = Array.from(parsedUrl.searchParams)
    .map(([name, value]) => {
      const masking = masked.has(`${QUERY_PREFIX}${name}`);
      return `${encodeURIComponent(name)}=${masking ? createRedactionToken(name) : encodeURIComponent(value)}`;
    })
    .join('&');

  parsedUrl.search = '';

  return `${method} ${parsedUrl.toString()}${query ? `?${query}` : ''}`;
}

function buildSanitizedHeaders(testOptions: TestOptions | null, masked: Set<string>): string {
  if (!testOptions) return '';

  const { headers } = testOptions;

  return Object.entries(headers)
    .map(
      ([name, value]) =>
        `${name}: ${masked.has(`${HEADER_PREFIX}${name}`) ? createRedactionToken(name) : String(value)}`,
    )
    .join('\n');
}

function buildSanitizedBody(testOptions: TestOptions | null, masked: Set<string>): HttpBody {
  if (!testOptions?.body) return null;

  const { body, headers } = testOptions;
  const maskedNames = getMaskedNames(masked, BODY_PREFIX);

  if (isUrlEncodedContentType(headers)) {
    const formEntries = convertUrlEncodedToFormEntries(String(body));
    for (const name of maskedNames) updateFormEntry(formEntries, name, createRedactionToken(name));

    return convertFormEntriesToUrlEncoded(formEntries);
  }

  if (!isObject(body)) return String(body);

  const maskedBody = structuredClone(body);
  for (const name of maskedNames) setDeepObjectProperty(maskedBody, name, createRedactionToken(name));

  return maskedBody;
}
