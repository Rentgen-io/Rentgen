import { getResponseStatusTitle, isClientErrorStatus, isSuccessStatus, RESPONSE_STATUS } from 'shared/responseStatus';
import type { HttpRequest, HttpResponse } from 'shared/types/http';
import type { TestEngineConfiguration } from 'shared/types/settings';
import {
  type DataType,
  type FileFormat,
  type Interval,
  type ParameterValue,
  type TestData,
  type TestOptions,
  type TestResult,
  TestStatus,
} from 'shared/types/testing';
import { getFileName } from 'shared/utils/http';
import { FILE_FORMATS, getTestFileName } from 'shared/utils/test-files';
import { prepareTestFiles } from 'src/api/files';
import { sendHttp } from 'src/api/network';
import { getDatasets } from 'src/constants/datasets';
import { createHttpRequest } from 'src/utils/http';
import { normalizeDecimal } from 'src/utils/number';
import { generateRandomNumber, generateRandomString } from 'src/utils/random';
import {
  BaseTests,
  createErrorTestResult,
  createTestResult,
  determineTestStatus,
  ERROR_RESPONSE_EXPECTED,
  ORIGINAL_REQUEST_TEST_PARAMETER_NAME,
  SUCCESS_RESPONSE_EXPECTED,
} from './BaseTests';
import { Abortable, Test } from './decorators';
import { createTestHttpRequest, extractBodyParameters, getBodyParameterValue } from './parameters';

const VALUE_NORMALIZATION_TEST_EXPECTED = `${RESPONSE_STATUS.BAD_REQUEST} ${getResponseStatusTitle(RESPONSE_STATUS.BAD_REQUEST)}/${RESPONSE_STATUS.UNPROCESSABLE_ENTITY} ${getResponseStatusTitle(RESPONSE_STATUS.UNPROCESSABLE_ENTITY)} or Trimmed/Normalized Value`;

export class DataDrivenTests extends BaseTests<TestResult[]> {
  private signal?: AbortSignal;
  private testFilesDirectory = '';

  constructor(
    options: TestOptions,
    private readonly settings: TestEngineConfiguration,
    onTestStart?: () => void,
  ) {
    super(options, onTestStart);
  }

  protected async execute(signal: AbortSignal): Promise<TestResult[]> {
    this.signal = signal;

    const results: TestResult[] = [];
    const { body, bodyParameters, headers, method, url } = this.options;

    if (Object.values(bodyParameters).some(({ type }) => type === 'file'))
      this.testFilesDirectory = await prepareTestFiles();

    const request = createHttpRequest(body, headers, method, url);

    // Test original request first as baseline
    results.push(await this.testOriginalRequest(request));

    await runDataDrivenTests(
      this.options,
      this.settings,
      async (parameterName: string, { type, overrides }: ParameterValue) => {
        const testData: TestData = {
          value: `   ${getBodyParameterValue(body, parameterName)}   `,
          valid: false,
        };
        const updateData = overrides?.find((override) => override.value === testData.value) || testData;

        results.push(
          await testRequestParameter(
            { ...this.options, parameterName, parameterType: 'body', testData: updateData },
            this.settings,
            type === 'enum'
              ? updateData.valid
                ? SUCCESS_RESPONSE_EXPECTED
                : ERROR_RESPONSE_EXPECTED
              : VALUE_NORMALIZATION_TEST_EXPECTED,
            this.signal!,
            type === 'enum' ? determineRequestParameterTestStatus : determineValueNormalizationTestStatus,
            this.onTestStart,
          ),
        );
      },
      async (parameterName: string, parameterValue: ParameterValue) => {
        results.push(
          ...((await this.testRequestParameterWithDataset(
            { ...this.options, parameterName, parameterType: 'body' },
            parameterValue,
          )) ?? []),
        );
      },
      async (parameterName: string, parameterValue: ParameterValue) => {
        results.push(
          ...((await this.testRequestParameterWithDataset(
            { ...this.options, parameterName, parameterType: 'query' },
            parameterValue,
          )) ?? []),
        );
      },
    );

    return results;
  }

  @Abortable
  @Test('Validates the original request succeeds as a baseline')
  private async testOriginalRequest(request: HttpRequest): Promise<TestResult> {
    this.onTestStart?.();

    try {
      const response = await sendHttp(request, this.signal);
      const { actual, status } = determineTestStatus(response, (response, statusCode) => {
        const testStatus = { actual: response.status, status: TestStatus.Fail };
        if (isSuccessStatus(statusCode)) testStatus.status = TestStatus.Pass;

        return testStatus;
      });

      return createTestResult(
        ORIGINAL_REQUEST_TEST_PARAMETER_NAME,
        SUCCESS_RESPONSE_EXPECTED,
        actual,
        status,
        request,
        response,
        request.body,
      );
    } catch (error) {
      return createErrorTestResult(
        ORIGINAL_REQUEST_TEST_PARAMETER_NAME,
        SUCCESS_RESPONSE_EXPECTED,
        String(error),
        request,
        request.body,
      );
    }
  }

  @Abortable
  private async testRequestParameterWithDataset(
    options: TestOptions,
    parameterValue: ParameterValue,
  ): Promise<TestResult[]> {
    const { type, value, overrides } = parameterValue;
    const results: TestResult[] = [];
    const datasets = getDatasets(this.settings.email.domain);
    const dataset = [
      ...generateDynamicTestData(parameterValue, this.testFilesDirectory),
      ...(datasets[type] || []).map((dataset) => {
        if (type !== 'string' || !dataset.valid) return dataset;

        return {
          ...dataset,
          value: (dataset.value as string).padEnd((value as Interval).min, 'x').substring(0, (value as Interval).max),
        };
      }),
    ];

    for (const data of dataset) {
      const updateData = overrides?.find((override) => override.value === data.value) || data;

      results.push(
        await testRequestParameter(
          { ...options, testData: updateData },
          this.settings,
          updateData.valid ? SUCCESS_RESPONSE_EXPECTED : ERROR_RESPONSE_EXPECTED,
          this.signal!,
          determineRequestParameterTestStatus,
          this.onTestStart,
        ),
      );
    }

    return results;
  }
}

export async function runDataDrivenTests(
  options: TestOptions,
  settings: TestEngineConfiguration,
  onValueNormalizationTest: (key: string, value: ParameterValue) => Promise<void>,
  onBodyParameterTest: (key: string, value: ParameterValue) => Promise<void>,
  onQueryParameterTest: (key: string, value: ParameterValue) => Promise<void>,
) {
  const { body, bodyParameters, queryParameters } = options;
  const originalBodyParameters = extractBodyParameters(body, settings);

  // Test string value normalization (trimming)
  for (const [key, value] of Object.entries(bodyParameters)) {
    const originalBodyParameter = originalBodyParameters[key];
    if (isParameterTestSkipped(value.type) || isNormalizationTestSkipped(originalBodyParameter?.type)) continue;
    await onValueNormalizationTest(key, value);
  }

  // Test body parameters
  for (const [key, value] of Object.entries(bodyParameters)) {
    if (isParameterTestSkipped(value.type)) continue;
    await onBodyParameterTest(key, value);
  }

  // Test query parameters
  for (const [key, value] of Object.entries(queryParameters)) {
    if (isParameterTestSkipped(value.type)) continue;
    await onQueryParameterTest(key, value);
  }
}

async function testRequestParameter(
  options: TestOptions,
  settings: TestEngineConfiguration,
  expected: string,
  signal: AbortSignal,
  determine: (
    response: HttpResponse,
    statusCode: number,
    testData?: TestData,
  ) => { actual: string; status: TestStatus },
  onTestStart?: () => void,
): Promise<TestResult> {
  onTestStart?.();

  const { bodyParameters, parameterName, parameterType, testData } = options;
  const request = createTestHttpRequest(options, settings);
  const isFileTest = parameterType === 'body' && !!parameterName && bodyParameters[parameterName]?.type === 'file';
  const value = isFileTest && typeof testData?.value === 'string' ? getFileName(testData.value) : testData?.value;
  const name = `${parameterType}.${parameterName}`;

  try {
    const response = await sendHttp(request, signal);
    const { actual, status } = determineTestStatus(response, (response, statusCode) =>
      determine(response, statusCode, testData),
    );

    return createTestResult(name, expected, actual, status, request, response, value);
  } catch (error) {
    return createErrorTestResult(name, expected, String(error), request, value);
  }
}

function determineValueNormalizationTestStatus(
  response: HttpResponse,
  statusCode: number,
  testData?: TestData,
): { actual: string; status: TestStatus } {
  if (statusCode === RESPONSE_STATUS.BAD_REQUEST || statusCode === RESPONSE_STATUS.UNPROCESSABLE_ENTITY)
    return { actual: response.status, status: TestStatus.Pass };

  const responseBody = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  if (!responseBody || !responseBody.includes(String(testData?.value).trim()))
    return {
      actual: `${response.status} → Check Manually via GET Method or Database`,
      status: TestStatus.Info,
    };

  if (!responseBody.includes(String(testData?.value)))
    return { actual: `${response.status} + Trimmed/Normalized Value`, status: TestStatus.Pass };

  return { actual: `${response.status} + Not Trimmed/Normalized Value`, status: TestStatus.Fail };
}

export function determineRequestParameterTestStatus(
  response: HttpResponse,
  statusCode: number,
  testData?: TestData,
): { actual: string; status: TestStatus } {
  const testStatus = { actual: response.status, status: TestStatus.Fail };
  if ((testData?.valid && isSuccessStatus(statusCode)) || (!testData?.valid && isClientErrorStatus(statusCode)))
    testStatus.status = TestStatus.Pass;

  return testStatus;
}

/**
 * The generated test data of a parameter: the "required" checks, and the type's own (enum values, number boundaries,
 * string lengths, test files). `testFilesDirectory` is where the test files are (see prepareTestFiles); without it the
 * test data can still be counted.
 */
export function generateDynamicTestData({ mandatory, type, value }: ParameterValue, filesDirectory = ''): TestData[] {
  const results: TestData[] = [];
  if (mandatory !== undefined) {
    results.push({ value: null, valid: !mandatory });

    if (!isNormalizationTestSkipped(type)) ['', '   '].forEach((value) => results.push({ value, valid: !mandatory }));
  }

  switch (type) {
    case 'enum':
      results.push(...generateEnumTestData(value as string));
      break;
    case 'number':
      results.push(...generateNumberBoundaryTestData(value as Interval));
      break;
    case 'numeric_string':
      results.push(...generateNumberBoundaryTestData(value as Interval, true));
      break;
    case 'string':
      if ((value as Interval).min > 1)
        results.push({ value: generateRandomString((value as Interval).min - 1), valid: false });

      results.push({ value: generateRandomString((value as Interval).max + 1), valid: false });
      break;
    case 'file':
      results.push(...generateFileTestData(Array.isArray(value) ? value : FILE_FORMATS, filesDirectory));
      break;
    default:
  }

  return results;
}

/** A sample file of every format: valid when its format is accepted (selected), invalid otherwise. */
export function generateFileTestData(acceptedFormats: FileFormat[], filesDirectory: string): TestData[] {
  return FILE_FORMATS.map((format) => ({
    value: `${filesDirectory}/${getTestFileName(format)}`,
    valid: acceptedFormats.includes(format),
  }));
}

export function generateEnumTestData(value: string): TestData[] {
  if (!value) return [];

  return value
    .split(',')
    .map((value) => value.trim())
    .flatMap((value) => [
      { value: value, valid: true },
      { value: value[0] + ' ' + value.slice(1), valid: false },
      {
        value:
          value.match(/[A-Za-z]/)?.[0].toLowerCase() === value.match(/[A-Za-z]/)?.[0]
            ? value.toUpperCase()
            : value.toLowerCase(),
        valid: false,
      },
    ]);
}

export function generateNumberBoundaryTestData({ min, max }: Interval, stringify: boolean = false): TestData[] {
  const dataset: TestData[] = [];
  const delta = Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01;
  const normalizedMin = normalizeDecimal(min);
  const normalizedMax = normalizeDecimal(max);
  const range = normalizedMax - normalizedMin;

  dataset.push({ value: normalizedMin, valid: true });

  if (range > 0) {
    if (range > delta) dataset.push({ value: normalizeDecimal(normalizedMin + delta), valid: true });

    if (range > 3 * delta)
      dataset.push({
        value: generateRandomNumber(
          normalizeDecimal(normalizedMin + 2 * delta),
          normalizeDecimal(normalizedMax - 2 * delta),
        ),
        valid: true,
      });

    if (range > 4 * delta)
      dataset.push({
        value: generateRandomNumber(
          normalizeDecimal(normalizedMin + 2 * delta),
          normalizeDecimal(normalizedMax - 2 * delta),
        ),
        valid: true,
      });

    if (range >= 3 * delta) dataset.push({ value: normalizeDecimal(normalizedMax - delta), valid: true });

    dataset.push({ value: normalizedMax, valid: true });
  }

  dataset.push({ value: normalizeDecimal(normalizedMin - delta), valid: false });
  dataset.push({ value: normalizeDecimal(normalizedMax + delta), valid: false });

  if (stringify) return dataset.map(({ value, valid }) => ({ value: String(value), valid }));

  return dataset;
}

export function isParameterTestSkipped(dataType: DataType): boolean {
  return (
    dataType === 'do-not-test' ||
    dataType === 'randomString' ||
    dataType === 'randomInt' ||
    dataType === 'randomEmail' ||
    dataType === 'randomGuid'
  );
}

export function isNormalizationTestSkipped(dataType: string | undefined): boolean {
  return dataType === 'file' || dataType === 'boolean' || dataType === 'number';
}
