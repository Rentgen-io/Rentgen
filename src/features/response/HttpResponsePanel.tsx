import cn from 'classnames';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { CopyButton } from 'src/components/buttons/CopyButton';
import Loader from 'src/components/loaders/Loader';
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

  if (!httpResponse && !isSending) return null;

  const isAborted = httpResponse?.status === RESPONSE_STATUS_LABEL.ABORTED;
  const isNetworkError = httpResponse?.status === RESPONSE_STATUS_LABEL.NETWORK_ERROR;
  const hasBodyParameters = Object.keys(bodyParameters).length > 0;
  const hasQueryParameters = Object.keys(queryParameters).length > 0;
  const hasParameters = hasBodyParameters || hasQueryParameters;

  return (
    <Panel
      title={
        <div
          className={cn('flex items-center justify-between gap-4 py-3 pr-4 text-sm font-bold', {
            'text-green-500': httpResponse?.status.startsWith('2') && !runResult?.warning,
            'text-yellow-500': httpResponse?.status.startsWith('2') && runResult?.warning,
            'text-blue-500': httpResponse?.status.startsWith('3'),
            'text-orange-500': httpResponse?.status.startsWith('4') || isAborted,
            'text-red-500': httpResponse?.status.startsWith('5') || isNetworkError || httpResponse?.status === 'Error',
          })}
        >
          {isSending ? (
            <Loader className="h-5 w-5 shrink-0 [&>span]:border-3!" />
          ) : (
            <>
              {isNetworkError ? t('response.networkError') : httpResponse?.status}{' '}
              <span className="text-xs text-text dark:text-dark-text">{httpResponse?.time.toFixed(2)} ms</span>
            </>
          )}
        </div>
      }
    >
      {runResult?.warning && (
        <div className="px-4 py-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-y border-yellow-200 dark:border-yellow-800">
          <span className="font-semibold">{t('common.warning')}:</span> {runResult.warning}
        </div>
      )}
      {httpResponse && (
        <div
          className={cn('@2xl:grid divide-y @2xl:divide-y-0 @2xl:divide-x divide-border dark:divide-dark-body', {
            '@2xl:grid-cols-2': !isNetworkError && hasParameters,
            'not-empty:border-t border-border dark:border-dark-body': !runResult?.warning,
          })}
        >
          <div className="flex flex-col gap-4 p-4">
            <h5 className="m-0">{t('response.title')}</h5>
            <Tabs
              className="relative flex flex-col flex-auto"
              selectedTabClassName="text-text dark:text-dark-text underline underline-offset-6 decoration-blue-500 cursor-default!"
            >
              <TabList className="m-0 mb-6 p-0 flex gap-4 text-xs text-text-secondary">
                <Tab className="list-none outline-none cursor-pointer">{t('request.body')}</Tab>
                <Tab className="list-none outline-none cursor-pointer">{t('request.headers')}</Tab>
              </TabList>
              <div ref={ref} className="flex flex-col flex-auto">
                <TabPanel>
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
                <TabPanel>
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
            <div className="flex flex-col gap-4 p-4">
              <h5 className="m-0">{t('tests.parameters')}</h5>
              <Tabs selectedTabClassName="text-text dark:text-dark-text underline underline-offset-6 decoration-blue-500 cursor-default!">
                <TabList className="m-0 mb-6 p-0 flex gap-4 text-xs text-text-secondary">
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
