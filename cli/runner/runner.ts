import type { Environment } from '../../shared/types/environment';
import type { FieldsBody } from '../../shared/types/http';
import type { PostmanBody, PostmanFolder, PostmanItem } from '../../shared/types/postman';
import { collectRequests } from '../../shared/utils/collection';
import { buildFieldsBody, isFieldsBody, withBodyContentType } from '../../shared/utils/http';
import { VariableStore } from '../config/variables';
import { HttpClient, type HttpResponse } from '../http/client';
import { extractDynamicVariable } from './extractor';
import type { DynamicVarDetail, RequestResult, RunResult } from './types';

export interface RunnerOptions {
  failFast: boolean;
  timeout: number;
  verbose: boolean;
}

type ResultCallback = (result: RequestResult, index: number, total: number) => void;

export class SequentialRunner {
  private httpClient: HttpClient;
  private results: RequestResult[] = [];
  private resultCallback: ResultCallback | null = null;
  private aborted = false;

  constructor(
    private folder: PostmanFolder,
    private environment: Environment | null,
    private options: RunnerOptions,
    private variableStore: VariableStore,
  ) {
    this.httpClient = new HttpClient(options.timeout);
  }

  onResult(callback: ResultCallback): void {
    this.resultCallback = callback;
  }

  abort(): void {
    this.aborted = true;
  }

  getPartialSummary(): RunResult {
    return this.buildSummary(0);
  }

  async run(): Promise<RunResult> {
    const startTime = performance.now();
    // Like in the app (and Postman): also the requests in subfolders, in the order they are listed
    const items = collectRequests(this.folder.item);
    const total = items.length;

    for (let i = 0; i < items.length; i++) {
      if (this.aborted) break;

      const result = await this.executeItem(items[i]);
      this.results.push(result);

      this.resultCallback?.(result, i + 1, total);

      if (!result.success && this.options.failFast) break;
    }

    return this.buildSummary(performance.now() - startTime);
  }

  private async executeItem(item: PostmanItem): Promise<RequestResult> {
    const resolved = this.variableStore.substituteRequest(item);
    const unresolvedNow = this.variableStore.getLastUnresolved();

    // As in the app: names and values trimmed, a header without a name is left out (a table row with only a value is
    // saved like that, and Node rejects an empty header name); when a header repeats, the last value wins
    const requestHeaders: Record<string, string> = {};
    for (const h of resolved.headers) if (h.key.trim()) requestHeaders[h.key.trim()] = h.value.trim();

    const headers = withBodyContentType(requestHeaders, resolved.body ?? {});
    const body = resolved.body && toRequestBody(resolved.body);
    const requestBody = describeRequestBody(body);

    let response: HttpResponse;
    try {
      response = await this.httpClient.send({
        method: resolved.method,
        url: resolved.url,
        headers,
        body,
      });
    } catch (error) {
      return {
        requestId: item.id,
        requestName: item.name,
        method: item.request.method,
        url: resolved.url,
        status: null,
        statusText: 'Network Error',
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
        dynamicVarsExtracted: [],
        dynamicVarsFailed: [],
        ...(this.options.verbose && {
          verbose: {
            requestHeaders: headers,
            requestBody,
            responseHeaders: {},
            responseBody: '',
            dynamicVarDetails: [],
            unresolvedVariables: unresolvedNow,
          },
        }),
      };
    }

    const dvarsExtracted: { key: string; value: string }[] = [];
    const dvarsFailed: { key: string; error: string }[] = [];
    const dynamicVarDetails: DynamicVarDetail[] = [];

    for (const dvar of this.variableStore.getDynamicVarsForRequest(item.id)) {
      const outcome = extractDynamicVariable(dvar, response);
      if (outcome.success && outcome.value !== null) {
        this.variableStore.update(dvar.key, outcome.value);
        dvarsExtracted.push({ key: dvar.key, value: outcome.value });
        dynamicVarDetails.push({
          key: dvar.key,
          selector: dvar.selector,
          source: dvar.source,
          extracted: true,
          value: outcome.value,
        });
      } else {
        dvarsFailed.push({ key: dvar.key, error: outcome.error ?? 'Unknown error' });
        dynamicVarDetails.push({
          key: dvar.key,
          selector: dvar.selector,
          source: dvar.source,
          extracted: false,
          error: outcome.error ?? 'Unknown error',
        });
      }
    }

    const success = response.statusCode >= 200 && response.statusCode < 300;

    const result: RequestResult = {
      requestId: item.id,
      requestName: item.name,
      method: item.request.method,
      url: resolved.url,
      status: response.statusCode,
      statusText: response.status,
      success,
      duration: response.duration,
      error: null,
      dynamicVarsExtracted: dvarsExtracted,
      dynamicVarsFailed: dvarsFailed,
    };

    if (this.options.verbose) {
      result.verbose = {
        requestHeaders: headers,
        requestBody,
        responseHeaders: response.headers,
        responseBody: response.body,
        dynamicVarDetails,
        unresolvedVariables: unresolvedNow,
      };
    }

    return result;
  }

  private buildSummary(duration: number): RunResult {
    const results = this.results;
    return {
      success: results.length > 0 && results.every((r) => r.success),
      totalRequests: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success && !r.error).length,
      errors: results.filter((r) => r.error !== null).length,
      duration: Math.round(duration),
      results,
    };
  }
}

/** As in the desktop app: the form-data / urlencoded fields for those modes, otherwise the raw text. */
function toRequestBody(body: PostmanBody): string | FieldsBody | undefined {
  return buildFieldsBody(body) ?? body.raw;
}

/** The request body as shown in verbose output: form fields as `name=value`, files as `name=@path`, one per line. */
function describeRequestBody(body: string | FieldsBody | undefined): string | undefined {
  if (!isFieldsBody(body)) return body;
  if (body.__type === 'urlencoded') return new URLSearchParams(body.entries).toString();

  return [
    ...body.entries.map(([name, value]) => `${name}=${value}`),
    ...(body.files ?? []).map(([name, filePath]) => `${name}=@${filePath}`),
  ].join('\n');
}
