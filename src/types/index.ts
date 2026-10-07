import { Method } from 'axios';
import { HttpBody, HttpRequest, HttpResponse } from 'shared/types/http';

export type DataType =
  | 'boolean'
  | 'currency'
  | 'date_yyyy_mm_dd'
  | 'email'
  | 'enum'
  | 'ftp_url'
  | 'guid'
  | 'ipv4'
  | 'number'
  | 'numeric_string'
  | 'phone'
  | 'string'
  | 'url'
  | 'do-not-test'
  | 'randomString'
  | 'randomInt'
  | 'randomEmail'
  | 'randomGuid';

export type ParameterType = 'body' | 'query';

export type ReportFormat = 'json' | 'md' | 'csv';

export interface ParameterValue {
  mandatory?: boolean;
  type: DataType;
  value?: number | string | Interval;
  overrides?: TestData[];
}

export interface Interval {
  min: number;
  max: number;
}

export interface ParsedCurlResult {
  body: string | null;
  decodedLines: string[];
  headers: Record<string, string>;
  method: string;
  url: string;
}

export interface RequestParameters {
  [key: string]: ParameterValue;
}

export interface TestData {
  value: any;
  valid: boolean;
}

export interface TestOptions {
  body: HttpBody;
  bodyParameters: RequestParameters;
  headers: Record<string, string>;
  method: Method | string;
  parameterName?: string;
  parameterType?: ParameterType;
  queryParameters: RequestParameters;
  testData?: TestData;
  url: string;
}

export interface TestResult {
  actual: string;
  expected: string;
  name: string;
  request: HttpRequest | null;
  response: HttpResponse | null;
  status: TestStatus;
  value?: any;
}

export interface TestResults {
  timestamp: number | null;
  count: number;
  crudTests: TestResult[];
  dataDrivenTests: TestResult[];
  performanceTests: TestResult[];
  securityTests: TestResult[];
  testOptions: TestOptions | null;
}

export enum TestStatus {
  Bug = '🟣 Bug',
  Fail = '🔴 Fail',
  FailNoResponse = '🔴 Fail (No response)',
  Info = '🔵 Info',
  Manual = '⚪ Manual',
  Pass = '🟢 Pass',
  Warning = '🟠 Warning',
}

export interface ReportSuite {
  name: string;
  summary: { total: number; byStatus: Record<string, number> };
  tests: TestResult[];
}

export interface ExportReport {
  generatedAt: string;
  generatedBy: string;
  target: {
    url: string;
    method: Method | string;
    headers: Record<string, string>;
    body: any;
  };
  lastHttpResponse: HttpResponse | null;
  suites: ReportSuite[];
}

export * from 'shared/types/environment';
export * from 'shared/types/http';
export * from 'shared/types/postman';
export * from 'shared/types/project';
export * from './ipc';
export * from './postman-full';
export * from './ui';
