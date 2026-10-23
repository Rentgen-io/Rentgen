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
import { getMaskableFields, getSuggestedMaskedFields, RequestRedactor } from 'src/test-engine/AiReportCompactor';
import { AI_RESPONSE_TIMEOUT_MS } from 'src/test-engine/AiTests';
import { createHttpRequest } from 'src/utils';

const PREVIEW_EDITOR_OPTIONS = { folding: false, lineNumbers: 'off' } as const;

interface Props {
  onCancel?(): void;
}

export function AiRequestMaskControls({ onCancel }: Props) {
  const { t } = useTranslation();
  const { aiRunStartedAt, cancelAiTestsGeneration, executeAiTestsGeneration } = useTests();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const testOptions = useAppSelector(selectTestOptions);

  const [masked, setMasked] = useState<Set<string>>(() => new Set(getSuggestedMaskedFields(testOptions?.headers)));

  const request = useMemo(() => {
    if (!testOptions) return null;

    const { body, headers, method, url } = testOptions;
    return createHttpRequest(body, headers, method, url);
  }, [testOptions]);

  const requestFields = useMemo(() => {
    if (!request) return [];
    return getMaskableFields(request);
  }, [request]);

  const sanitizedRequest = useMemo(() => {
    if (!request) return null;

    const { body, headers, url } = new RequestRedactor(request, masked).redactRequest(request);

    return {
      url: `${request.method} ${url}`,
      headers: Object.entries(headers)
        .map(([name, value]) => `${name}: ${value}`)
        .join('\n'),
      body: body ?? null,
    };
  }, [masked, request]);

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
            {sanitizedRequest &&
              ([sanitizedRequest.url, sanitizedRequest.headers, sanitizedRequest.body] as const).map(
                (source, index) => {
                  if (!source) return null;

                  return <JsonViewer key={index} minHeight={0} options={PREVIEW_EDITOR_OPTIONS} source={source} />;
                },
              )}
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
            executeAiTestsGeneration(testOptions, [...masked]);
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
