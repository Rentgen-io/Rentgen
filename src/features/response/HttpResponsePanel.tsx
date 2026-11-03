import cn from 'classnames';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { CopyButton } from 'src/components/buttons/CopyButton';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import Panel from 'src/components/panels/Panel';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import { useElementHeight } from 'src/hooks/useElementHeight';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
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

export default function HttpResponsePanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const httpResponse = useAppSelector(selectHttpResponse);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const requestWithFolder = useAppSelector(selectSelectedRequestWithFolder);
  const runResult = useAppSelector(selectSelectedRequestRunResult);

  const [ref, height] = useElementHeight<HTMLDivElement>();
  const { autoSaveRequest } = useSaveRequest();
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

  if (!httpResponse && !isSending)
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-3 min-h-40 text-xs text-muted-foreground">
        <span className="text-3xl leading-none opacity-50">↗</span>
        <strong className="text-foreground">{t('response.requestHint')}</strong>
        <span>{t('response.responseHint')}</span>
      </div>
    );

  const isAborted = httpResponse?.status === RESPONSE_STATUS_LABEL.ABORTED;
  const isNetworkError = httpResponse?.status === RESPONSE_STATUS_LABEL.NETWORK_ERROR;
  const hasBodyParameters = Object.keys(bodyParameters).length > 0;
  const hasQueryParameters = Object.keys(queryParameters).length > 0;
  const hasParameters = hasBodyParameters || hasQueryParameters;

  return (
    <Panel
      title={
        <div className="flex items-center justify-between gap-4 py-3 pr-4 text-sm font-medium text-muted-foreground">
          <span className="flex-auto">
            {t('response.title')} {hasParameters && '/ ' + t('tests.parameters')}
          </span>
          {isSending ? (
            <LoaderWithText
              className="w-auto text-xs font-normal [&_.loader]:h-4 [&_.loader]:w-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
              text={t('response.sending')}
            />
          ) : (
            <>
              {isNetworkError ? (
                t('response.networkError')
              ) : (
                <span
                  className={cn('py-px px-2 text-xs rounded', {
                    'text-green-500 bg-green-500/10': httpResponse?.status.startsWith('2') && !runResult?.warning,
                    'text-yellow-500 bg-yellow-500/10': httpResponse?.status.startsWith('2') && runResult?.warning,
                    'text-blue-500 bg-blue-500/10': httpResponse?.status.startsWith('3'),
                    'text-orange-500 bg-orange-500/10': httpResponse?.status.startsWith('4') || isAborted,
                    'text-red-500 bg-red-500/10':
                      httpResponse?.status.startsWith('5') || isNetworkError || httpResponse?.status === 'Error',
                  })}
                >
                  {httpResponse?.status}
                </span>
              )}{' '}
              <span className="text-xs font-normal">{httpResponse?.time.toFixed(2)} ms</span>
            </>
          )}
        </div>
      }
    >
      {runResult?.warning && (
        <div className="px-4 py-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-y border-yellow-200 dark:border-yellow-800">
          <span className="font-medium">{t('common.warning')}:</span> {runResult.warning}
        </div>
      )}
      {httpResponse && (
        <div
          className={cn('@2xl:grid divide-y @2xl:divide-y-0 @2xl:divide-x divide-border', {
            '@2xl:grid-cols-2': !isNetworkError && hasParameters,
            'not-empty:border-t border-border': !runResult?.warning,
          })}
        >
          <div className="flex flex-col gap-4 py-3 px-4">
            <Tabs
              className="relative flex flex-col flex-auto"
              forceRenderTabPanel
              selectedTabClassName="text-foreground underline underline-offset-6 decoration-2 decoration-primary cursor-default!"
              selectedTabPanelClassName="block!"
            >
              <TabList className="flex gap-4 m-0 mb-6 p-0 text-xs font-medium text-muted-foreground">
                <Tab className="list-none outline-none cursor-pointer">{t('request.body')}</Tab>
                <Tab className="list-none outline-none cursor-pointer">{t('request.headers')}</Tab>
              </TabList>
              <div ref={ref} className="flex flex-col flex-auto">
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
                    maxHeight={Math.max(280, height)}
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
                    maxHeight={Math.max(280, height)}
                    responsePanelContext={{ isResponsePanel: true, source: 'header' }}
                    showVariableButtons={!!requestWithFolder}
                    source={httpResponse.headers}
                    onSetVariable={(path, value) => setVariable(path, value, 'header')}
                  />
                </TabPanel>
              </div>
            </Tabs>
          </div>
          {!isNetworkError && hasParameters && (
            <div className="flex flex-col gap-4 py-3 px-4">
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
                      onBlur={autoSaveRequest}
                      onChange={(parameters) => dispatch(requestActions.setBodyParameters(parameters))}
                    />
                  </TabPanel>
                )}
                {hasQueryParameters && (
                  <TabPanel>
                    <ParametersPanel
                      parameters={queryParameters}
                      onBlur={autoSaveRequest}
                      onChange={(parameters) => dispatch(requestActions.setQueryParameters(parameters))}
                    />
                  </TabPanel>
                )}
              </Tabs>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
