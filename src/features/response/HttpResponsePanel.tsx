import cn from 'classnames';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { CopyButton } from 'src/components/buttons/CopyButton';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import Panel from 'src/components/panels/Panel';
import ResizeHandler from 'src/components/panels/ResizeHandler';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import { useElementHeight } from 'src/hooks/useElementHeight';
import { useResizableSize } from 'src/hooks/useResizableSize';
import { useSendHttpRequest } from 'src/hooks/useSendHttpRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBodyParameters,
  selectHttpResponse,
  selectQueryParameters,
  selectSelectedRequestId,
  selectSelectedRequestRunResult,
  selectSelectedRequestWithFolder,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import ParametersPanel from '../parameters/ParametersPanel';
import { isAbortedResponse } from 'src/utils';

const MIN_RESPONSE_HEIGHT = 160;
const MAX_RESPONSE_HEIGHT = '50vh';
const AUTO_VIEWER_MAX_HEIGHT = 280;

interface Props {
  showParameters?: boolean;
}

export default function HttpResponsePanel({ showParameters = true }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const httpResponse = useAppSelector(selectHttpResponse);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const requestWithFolder = useAppSelector(selectSelectedRequestWithFolder);
  const runResult = useAppSelector(selectSelectedRequestRunResult);

  const [viewerRef, viewerHeight] = useElementHeight<HTMLDivElement>();
  const { handleProps, size, targetRef } = useResizableSize<HTMLDivElement>({
    dimension: 'height',
    maxSize: MAX_RESPONSE_HEIGHT,
    minSize: MIN_RESPONSE_HEIGHT,
    storageKey: 'responsePanelHeight',
  });
  const { isSending } = useSendHttpRequest();

  const setVariable = useCallback(
    (path: string, value: string, source: 'body' | 'header') => {
      if (!requestWithFolder || !selectedRequestId) return;

      const { folder, request } = requestWithFolder;
      dispatch(
        modalsActions.openSetAsDynamicVariableModal({
          initialSelector: path,
          initialValue: value,
          collectionName: folder.name,
          requestId: selectedRequestId,
          requestName: request.name,
          source,
        }),
      );
    },
    [requestWithFolder, selectedRequestId, dispatch],
  );

  const isNetworkError = httpResponse?.status === RESPONSE_STATUS_LABEL.NETWORK_ERROR;
  const hasBodyParameters = Object.keys(bodyParameters).length > 0;
  const hasQueryParameters = Object.keys(queryParameters).length > 0;
  const hideParameters = isNetworkError || !showParameters || (!hasBodyParameters && !hasQueryParameters);
  const isFixedHeight = size !== null;
  const panelStyle = isFixedHeight ? { height: size } : undefined;
  const viewerMaxHeight = isFixedHeight ? viewerHeight : Math.max(AUTO_VIEWER_MAX_HEIGHT, viewerHeight);

  return (
    <Panel
      className="relative"
      title={
        <div className="flex items-center justify-between gap-4 py-2.75 pr-4 text-xs font-medium text-muted-foreground">
          <span className="flex-auto py-px text-foreground">
            {t('response.title')}
            {!hideParameters && ' / ' + t('tests.parameters')}
          </span>
          {isSending ? (
            <LoaderWithText
              className="w-auto text-xs font-normal [&_.loader]:size-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
              text={t('response.sending')}
            />
          ) : (
            httpResponse && (
              <>
                {isNetworkError ? (
                  <span className="py-px px-2 text-xs text-red-500 bg-red-500/10 rounded">
                    {t('response.networkError')}
                  </span>
                ) : (
                  <span
                    className={cn('py-px px-2 text-xs rounded', {
                      'text-metric-pass bg-metric-pass/10': httpResponse?.status.startsWith('2') && !runResult?.warning,
                      'text-metric-warning bg-metric-warning/10':
                        httpResponse?.status.startsWith('2') && runResult?.warning,
                      'text-blue-500 bg-blue-500/10': httpResponse?.status.startsWith('3'),
                      'text-primary bg-primary/10':
                        httpResponse?.status.startsWith('4') || isAbortedResponse(httpResponse),
                      'text-metric-fail bg-metric-fail/10':
                        httpResponse?.status.startsWith('5') || isNetworkError || httpResponse?.status === 'Error',
                    })}
                  >
                    {httpResponse?.status}
                  </span>
                )}{' '}
                <span className="text-xs font-normal">{httpResponse?.time.toFixed(2)} ms</span>
              </>
            )
          )}
        </div>
      }
    >
      {runResult?.warning && (
        <div className="px-4 py-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-y border-yellow-200 dark:border-yellow-800">
          <span className="font-medium">{t('common.warning')}:</span> {runResult.warning}
        </div>
      )}
      {httpResponse ? (
        <div
          className={cn({
            '@2xl:grid @2xl:grid-cols-2 divide-y @2xl:divide-y-0 @2xl:divide-x divide-border': !hideParameters,
            'not-empty:border-t border-border': !runResult?.warning,
          })}
        >
          <div ref={targetRef} className="box-border flex flex-col gap-4 py-3 px-4" style={panelStyle}>
            <Tabs
              className="relative flex flex-col flex-auto min-h-0"
              forceRenderTabPanel
              selectedTabClassName="text-foreground underline underline-offset-6 decoration-2 decoration-primary cursor-default!"
              selectedTabPanelClassName="block!"
            >
              <TabList className="flex gap-4 m-0 mb-6 p-0 text-xs font-medium text-muted-foreground">
                <Tab className="list-none outline-none cursor-pointer">{t('request.body')}</Tab>
                <Tab className="list-none outline-none cursor-pointer">{t('request.headers')}</Tab>
              </TabList>
              <div ref={viewerRef} className="flex flex-col flex-auto min-h-0 overflow-hidden">
                <TabPanel className="hidden">
                  {httpResponse.body && (
                    <CopyButton
                      className="absolute -top-0.75 right-0"
                      textToCopy={
                        typeof httpResponse.body === 'string'
                          ? httpResponse.body
                          : JSON.stringify(httpResponse.body, null, 2)
                      }
                    >
                      {t('common.copy')}
                    </CopyButton>
                  )}
                  <JsonViewer
                    maxHeight={viewerMaxHeight}
                    responsePanelContext={{ isResponsePanel: true, source: 'body' }}
                    showVariableButtons={!!requestWithFolder}
                    source={httpResponse.body}
                    onSetVariable={(path, value) => setVariable(path, value, 'body')}
                  />
                </TabPanel>
                <TabPanel className="hidden">
                  {httpResponse.headers && (
                    <CopyButton
                      className="absolute -top-0.75 right-0"
                      textToCopy={JSON.stringify(httpResponse.headers, null, 2)}
                    >
                      {t('common.copy')}
                    </CopyButton>
                  )}
                  <JsonViewer
                    maxHeight={viewerMaxHeight}
                    responsePanelContext={{ isResponsePanel: true, source: 'header' }}
                    showVariableButtons={!!requestWithFolder}
                    source={httpResponse.headers}
                    onSetVariable={(path, value) => setVariable(path, value, 'header')}
                  />
                </TabPanel>
              </div>
            </Tabs>
          </div>
          {!hideParameters && (
            // Side by side with a fixed height, the parameters are taken out of the flow so they scroll instead of
            // stretching the row (the column still matches the row height); stacked, they simply follow the response
            <div className="relative">
              <div
                className={cn('flex flex-col gap-4 py-3 px-4', {
                  '@2xl:absolute @2xl:inset-0 @2xl:overflow-y-auto @2xl:scrollbar-gutter-stable': isFixedHeight,
                })}
              >
                <Tabs selectedTabClassName="text-foreground underline underline-offset-6 decoration-2 decoration-primary cursor-default!">
                  <TabList className="flex gap-4 m-0 mb-6 p-0 text-xs font-medium text-muted-foreground">
                    {hasBodyParameters && (
                      <Tab className="list-none outline-none cursor-pointer">{t('tests.bodyParameters')}</Tab>
                    )}
                    {hasQueryParameters && (
                      <Tab className="list-none outline-none cursor-pointer">{t('tests.queryParameters')}</Tab>
                    )}
                  </TabList>
                  {hasBodyParameters && (
                    <TabPanel>
                      <ParametersPanel
                        parameters={bodyParameters}
                        onChange={(parameters) => dispatch(requestActions.updateBodyParameters(parameters))}
                      />
                    </TabPanel>
                  )}
                  {hasQueryParameters && (
                    <TabPanel>
                      <ParametersPanel
                        parameters={queryParameters}
                        onChange={(parameters) => dispatch(requestActions.updateQueryParameters(parameters))}
                      />
                    </TabPanel>
                  )}
                </Tabs>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-border">
          <div
            ref={targetRef}
            className="flex flex-col items-center justify-center gap-2 p-3 min-h-40 text-xs text-muted-foreground box-border"
            style={panelStyle}
          >
            <span className="text-3xl leading-none opacity-50">↗</span>
            <strong className="text-foreground">{t('response.requestHint')}</strong>
            <span>{t('response.responseHint')}</span>
          </div>
        </div>
      )}
      <ResizeHandler title={t('common.resizeHint')} {...handleProps} />
    </Panel>
  );
}
