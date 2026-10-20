import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Toggle from 'src/components/inputs/Toggle';
import Loader from 'src/components/loaders/Loader';
import Timer from 'src/components/timers/Timer';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import useTests from 'src/hooks/useTests';
import { useAppSelector } from 'src/store/hooks';
import { selectActiveAiProvider, selectTestOptions } from 'src/store/selectors';
import { SENSITIVE_HEADERS } from 'src/test-engine';
import { AI_RESPONSE_TIMEOUT_MS } from 'src/test-engine/AiTests';
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

const PREVIEW_EDITOR_OPTIONS = { folding: false, lineNumbers: 'off' } as const;

interface Props {
  onCancel?(): void;
}

export function AiRequestMaskControls({ onCancel }: Props) {
  const { t } = useTranslation();
  const { aiRunStartedAt, cancelAiTestsGeneration, executeAiTestsGeneration } = useTests();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const testOptions = useAppSelector(selectTestOptions);

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

  const isAiRunning = Boolean(aiRunStartedAt);

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-4">
        <div className="flex-auto">
          <h5 className="m-0 mb-1">{t('controls.reviewDataSentToAi')}</h5>
          <p className="m-0 text-xs text-text-secondary">{t('controls.reviewDataSentToAiDescription')}</p>
        </div>
        <div className="text-xs">
          {activeAiProvider?.name} · {activeAiProvider?.model}
        </div>
      </div>
      <div className="@2xl:grid @2xl:grid-cols-2 border border-border dark:border-dark-body divide-y @2xl:divide-y-0 @2xl:divide-x divide-border dark:divide-dark-body">
        <div>
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 bg-body dark:bg-dark-body text-sm font-bold truncate">
            {t('controls.requestFields')}
            <span className="font-normal text-xs text-text-secondary truncate">
              {t('controls.masked', { masked: masked.size })}
            </span>
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
        <div>
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 bg-body dark:bg-dark-body text-sm font-bold truncate">
            {t('controls.sanitizedPreview')}
            <span className="font-normal text-xs text-text-secondary truncate">{t('controls.readyToSend')}</span>
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
        <Button buttonType={ButtonType.SECONDARY} onClick={isAiRunning ? cancelAiTestsGeneration : onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          className="min-w-43 flex justify-center items-center"
          disabled={isAiRunning || !activeAiProvider || !testOptions}
          onClick={() => {
            executeAiTestsGeneration(testOptions);
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            });
          }}
        >
          {isAiRunning ? (
            <Loader className="h-4 w-4 [&>span]:border-2!" mode="dark" />
          ) : (
            t('controls.generateAdditionalTests')
          )}
        </Button>
      </div>
      {isAiRunning && (
        <div className="@xl:text-right text-xs text-text-secondary">
          <Trans
            i18nKey="ai.waitingForResponse"
            components={{
              timer: (
                <Timer
                  className="font-bold text-text dark:text-dark-text"
                  startedAt={aiRunStartedAt}
                  timeoutMs={AI_RESPONSE_TIMEOUT_MS}
                />
              ),
            }}
          />
        </div>
      )}
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
