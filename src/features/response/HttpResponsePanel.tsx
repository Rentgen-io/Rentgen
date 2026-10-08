import cn from 'classnames';
import { Ref, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { CopyButton } from 'src/components/buttons/CopyButton';
import Loader from 'src/components/loaders/Loader';
import Panel from 'src/components/panels/Panel';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
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

interface Props {
  parametersRef: Ref<HTMLDivElement>;
}

export default function HttpResponsePanel({ parametersRef }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const httpResponse = useAppSelector(selectHttpResponse);
  const runResult = useAppSelector(selectSelectedRequestRunResult);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const requestWithFolder = useAppSelector(selectSelectedRequestWithFolder);

  const { autoSaveRequest } = useSaveRequest();

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

  if (!httpResponse) return null;

  const isSending = httpResponse.status === RESPONSE_STATUS_LABEL.SENDING;
  const isNetworkError = httpResponse.status === RESPONSE_STATUS_LABEL.NETWORK_ERROR;
  const hasParameters = Object.keys(bodyParameters).length > 0 || Object.keys(queryParameters).length > 0;

  return (
    <>
      <Panel title={t('response.title')}>
        <div
          className={cn(
            'flex items-center justify-between gap-4 py-2 px-4 text-sm font-bold bg-body dark:bg-dark-body border-t border-border dark:border-dark-body',
            {
              'text-green-500': httpResponse.status.startsWith('2') && !runResult?.warning,
              'text-yellow-500': httpResponse.status.startsWith('2') && runResult?.warning,
              'text-blue-500': httpResponse.status.startsWith('3'),
              'text-orange-500': httpResponse.status.startsWith('4'),
              'text-red-500': httpResponse.status.startsWith('5') || isNetworkError || httpResponse.status === 'Error',
            },
          )}
        >
          {isSending ? (
            <Loader className="h-5 w-5" />
          ) : (
            <>
              {isNetworkError ? t('response.networkError') : httpResponse.status}{' '}
              <span className="text-xs text-text dark:text-dark-text">{httpResponse.time.toFixed(2)} ms</span>
            </>
          )}
        </div>
        {runResult?.warning && (
          <div className="px-4 py-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-t border-yellow-200 dark:border-yellow-800">
            <span className="font-semibold">{t('common.warning')}:</span> {runResult.warning}
          </div>
        )}
        {!isSending && (
          <div className="grid grid-cols-2 items-stretch max-h-100 py-4 border-t border-border dark:border-dark-body overflow-hidden">
            <div className="relative flex-1 px-4">
              <h5 className="m-0 mb-4">{t('request.headers')}</h5>
              {httpResponse.headers && (
                <CopyButton
                  className="absolute top-0 right-4"
                  textToCopy={JSON.stringify(httpResponse.headers, null, 2)}
                >
                  {t('common.copy')}
                </CopyButton>
              )}
              <JsonViewer
                source={httpResponse.headers}
                responsePanelContext={{ isResponsePanel: true, source: 'header' }}
                showVariableButtons={!!requestWithFolder}
                onSetVariable={(path, value) => setVariable(path, value, 'header')}
              />
            </div>
            <div className="relative flex-1 px-4 border-l border-border dark:border-dark-body">
              <h5 className="m-0 mb-4">{t('request.body')}</h5>
              {httpResponse.body && (
                <CopyButton
                  className="absolute top-0 right-4"
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
                source={httpResponse.body}
                responsePanelContext={{ isResponsePanel: true, source: 'body' }}
                showVariableButtons={!!requestWithFolder}
                onSetVariable={(path, value) => setVariable(path, value, 'body')}
              />
            </div>
          </div>
        )}
      </Panel>

      {!isNetworkError && hasParameters && (
        <div ref={parametersRef}>
          <Panel title={t('tests.parameters')}>
            <div className="grid lg:grid-cols-2 items-stretch border-t border-border dark:border-dark-body">
              {Object.keys(bodyParameters).length > 0 && (
                <ParametersPanel
                  className="border-none"
                  title={t('tests.bodyParameters')}
                  parameters={bodyParameters}
                  onBlur={autoSaveRequest}
                  onChange={(parameters) => dispatch(requestActions.setBodyParameters(parameters))}
                />
              )}

              {Object.keys(queryParameters).length > 0 && (
                <ParametersPanel
                  className={cn(
                    'not-nth-[2]:border-none',
                    'nth-[2]:border-x-0 nth-[2]:border-b-0 nth-[2]:border-t nth-[2]:dark:border-dark-body!',
                    'lg:nth-[2]:border-y-0 lg:nth-[2]:border-l lg:nth-[2]:border-r-0',
                  )}
                  title={t('tests.queryParameters')}
                  parameters={queryParameters}
                  onBlur={autoSaveRequest}
                  onChange={(parameters) => dispatch(requestActions.setQueryParameters(parameters))}
                />
              )}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
