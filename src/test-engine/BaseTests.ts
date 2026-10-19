import { RESPONSE_STATUS } from 'shared/responseStatus';
import { HttpRequest, HttpResponse, TestOptions, TestResult, TestStatus } from 'src/types';
import { extractStatusCode } from 'src/utils';

export const ERROR_RESPONSE_EXPECTED = '4xx';
export const NOT_AVAILABLE_TEST = 'Not Available';
export const ORIGINAL_REQUEST_TEST_PARAMETER_NAME = '[original request]';
export const SUCCESS_RESPONSE_EXPECTED = '2xx';

export abstract class BaseTests {
  private _aborted = false;

  public get aborted() {
    return this._aborted;
  }

  constructor(
    protected options: TestOptions,
    protected onTestStart?: () => void,
  ) {
    this.options = options;
    this.onTestStart = onTestStart;
  }

  public abort() {
    this._aborted = true;
  }

  public abstract run(): any;
}

export function createTestResult(
  name: string,
  expected: string,
  actual: string,
  status: TestStatus,
  request: HttpRequest | null = null,
  response: HttpResponse | null = null,
  value: any = undefined,
): TestResult {
  return { name, expected, actual, status, value, request, response };
}

export function createErrorTestResult(
  name: string,
  expected: string,
  actual: string,
  request: HttpRequest | null = null,
  value: any = undefined,
): TestResult {
  return createTestResult(name, expected, `Unexpected Error: ${actual}`, TestStatus.Bug, request, null, value);
}

export function determineTestStatus(
  response: HttpResponse,
  determine: (response: HttpResponse, statusCode: number) => { actual: string; status: TestStatus },
  allowedStatusCodes: number[] = [],
): {
  actual: string;
  status: TestStatus;
} {
  const statusCode = extractStatusCode(response);
  if (statusCode >= RESPONSE_STATUS.SERVER_ERROR && !allowedStatusCodes.includes(statusCode))
    return { actual: response.status, status: TestStatus.Bug };

  return determine(response, statusCode);
}

export function getTestsStatistics(tests: TestResult[], disabledTests?: string[]) {
  return tests.reduce(
    (acc, { name, status }) => {
      switch (status) {
        case TestStatus.Fail:
        case TestStatus.FailNoResponse:
          if (!disabledTests?.includes(name)) acc.failed += 1;
          break;
        case TestStatus.Warning:
          if (!disabledTests?.includes(name)) acc.warnings += 1;
          break;
        case TestStatus.Bug:
          if (!disabledTests?.includes(name)) acc.bugs += 1;
          break;
        case TestStatus.Pass:
          if (!disabledTests?.includes(name)) acc.passed += 1;
          break;
      }
      return acc;
    },
    { bugs: 0, failed: 0, passed: 0, warnings: 0 },
  );
}
