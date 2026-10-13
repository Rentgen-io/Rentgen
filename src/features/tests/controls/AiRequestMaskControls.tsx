import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Toggle from 'src/components/inputs/Toggle';
import { useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectPotentialBugsCount,
  selectTestOptions,
  selectTestsCount,
} from 'src/store/selectors';
import { SENSITIVE_HEADERS } from 'src/test-engine';
import { HttpBody, TestOptions } from 'src/types';
import {
  convertFormEntriesToUrlEncoded,
  convertUrlEncodedToFormEntries,
  extractPropertiesFromJson,
  extractQueryParameters,
  isObject,
  isUrlEncodedContentType,
  setDeepObjectProperty,
  updateFormEntry,
} from 'src/utils';

const URL_FIELD = 'URL';
const BODY_PREFIX = 'body.';
const HEADER_PREFIX = 'header.';
const QUERY_PREFIX = 'query.';

interface Props {
  onCancel?(): void;
}

export function AiRequestMaskControls({ onCancel }: Props) {
  const { t } = useTranslation();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const testOptions = useAppSelector(selectTestOptions);
  const testsCount = useAppSelector(selectTestsCount);
  const potentialBugsCount = useAppSelector(selectPotentialBugsCount);

  const [masked, setMasked] = useState<Set<string>>(() => getSuggestedMasks(testOptions?.headers));

  const requestFields = useMemo(() => getRequestFields(testOptions), [testOptions]);
  const sanitizedPreview = useMemo(
    () =>
      `${buildSanitizedPreview(testOptions, masked)}\n\nReport: ${testsCount === 1 ? '1 test' : `${testsCount} tests`}\nPotential bugs: ${potentialBugsCount}`,
    [masked, potentialBugsCount, testsCount, testOptions],
  );

  const toggleMask = useCallback((name: string) => {
    setMasked((previousMasked) => {
      const nextMasked = new Set(previousMasked);
      if (!nextMasked.delete(name)) nextMasked.add(name);

      return nextMasked;
    });
  }, []);

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
                <span className="flex-1 font-monospace text-[#a31515] dark:text-[#9cdcfe] truncate">{name}</span>
                <span className="flex-1 font-monospace text-[#0451a5] dark:text-[#ce9178] truncate">
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
          <div className="border-t border-border dark:border-dark-body p-4">
            <pre className="m-0 font-monospace text-xs whitespace-pre-wrap break-all">{sanitizedPreview}</pre>
          </div>
        </div>
      </div>
      <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-end gap-4 @xl:gap-2 @xl:min-w-0">
        <Button buttonType={ButtonType.SECONDARY} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => {}}>Generate Additional Tests</Button>
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
    .reduce<any>((value, key) => (value == null ? undefined : value[key]), source);
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

function maskRequestLine(url: string, method: string, masked: Set<string>): string {
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

function maskHeaders(headers: Record<string, string>, masked: Set<string>): string[] {
  return Object.entries(headers).map(
    ([name, value]) => `${name}: ${masked.has(`${HEADER_PREFIX}${name}`) ? createRedactionToken(name) : String(value)}`,
  );
}

function maskBody(body: HttpBody, headers: Record<string, string>, masked: Set<string>): string {
  if (!body) return '';

  const maskedNames = getMaskedNames(masked, BODY_PREFIX);

  if (isUrlEncodedContentType(headers)) {
    const formEntries = convertUrlEncodedToFormEntries(String(body));
    for (const name of maskedNames) updateFormEntry(formEntries, name, createRedactionToken(name));

    return convertFormEntriesToUrlEncoded(formEntries);
  }

  if (!isObject(body)) return String(body);

  const maskedBody = structuredClone(body);
  for (const name of maskedNames) setDeepObjectProperty(maskedBody, name, createRedactionToken(name));

  return JSON.stringify(maskedBody, null, 2);
}

function buildSanitizedPreview(testOptions: TestOptions | null, masked: Set<string>): string {
  if (!testOptions) return '';

  const { body, headers, method, url } = testOptions;

  const maskedHeaders = [maskRequestLine(url, String(method), masked), ...maskHeaders(headers, masked)].join('\n');
  const maskedBody = maskBody(body, headers, masked);

  return maskedBody ? `${maskedHeaders}\n\n${maskedBody}` : maskedHeaders;
}
