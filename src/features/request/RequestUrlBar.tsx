import { Method } from 'axios';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useSendHttpRequest } from 'src/hooks/useSendHttpRequest';
import { useWssActions } from 'src/hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectIsRequestDisabled,
  selectMethod,
  selectMode,
  selectSelectedEnvironment,
  selectUrl,
  selectVariableNames,
  selectWssConnected,
} from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';

const methodOptions: SelectOption<Method>[] = [
  { value: 'GET', label: 'GET', className: 'text-method-get! dark:text-dark-method-get!' },
  { value: 'POST', label: 'POST', className: 'text-method-post! dark:text-dark-method-post!' },
  { value: 'PUT', label: 'PUT', className: 'text-method-put! dark:text-dark-method-put!' },
  { value: 'PATCH', label: 'PATCH', className: 'text-method-patch! dark:text-dark-method-patch!' },
  { value: 'DELETE', label: 'DELETE', className: 'text-method-delete! dark:text-dark-method-delete!' },
  { value: 'HEAD', label: 'HEAD', className: 'text-method-head! dark:text-dark-method-head!' },
  { value: 'QUERY', label: 'QUERY', className: 'text-method-query! dark:text-dark-method-query!' },
  { value: 'OPTIONS', label: 'OPTIONS', className: 'text-method-options! dark:text-dark-method-options!' },
];

export default function RequestUrlBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const mode = useAppSelector(selectMode);
  const method = useAppSelector(selectMethod);
  const url = useAppSelector(selectUrl);
  const disabled = useAppSelector(selectIsRequestDisabled);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectVariableNames);
  const wssConnected = useAppSelector(selectWssConnected);

  const sendHttp = useSendHttpRequest();
  const { saveRequest, autoSaveRequest } = useSaveRequest();
  const { connect, disconnect, send } = useWssActions();

  return (
    <div className="flex flex-col @lg:flex-row @lg:items-center gap-2">
      <div className="flex-auto flex items-center">
        {mode === 'HTTP' && (
          <Select
            className="font-bold uppercase"
            classNames={{
              control: () => 'dark:border-r-dark-body!',
              input: () => '[&>:first-child]:uppercase',
            }}
            isCreatable={true}
            options={methodOptions}
            placeholder={t('request.methodPlaceholder')}
            value={methodOptions.find((option) => option.value == method) || { value: method, label: method }}
            onChange={(option) => dispatch(requestActions.setMethod((option as SelectOption<Method>).value))}
          />
        )}
        <HighlightedInput
          className={cn('flex-auto', { 'border-l-0': mode === 'HTTP' })}
          highlightColor={selectedEnvironment?.color}
          placeholder={t('request.enterUrl')}
          value={url}
          variables={variables}
          onBlur={autoSaveRequest}
          onChange={(event) => dispatch(requestActions.setUrl(event.target.value))}
        />
      </div>
      {mode === 'HTTP' && (
        <>
          <Button disabled={disabled} onClick={sendHttp}>
            {t('common.send')}
          </Button>
          <Button buttonType={ButtonType.SECONDARY} disabled={disabled} onClick={() => saveRequest()}>
            {t('common.save')}
          </Button>
        </>
      )}
      {mode === 'WSS' && (
        <>
          <Button
            buttonType={wssConnected ? ButtonType.SECONDARY : ButtonType.PRIMARY}
            disabled={!wssConnected && !url}
            onClick={wssConnected ? disconnect : connect}
          >
            {wssConnected ? t('common.disconnect') : t('common.connect')}
          </Button>
          <Button disabled={!wssConnected} onClick={send}>
            {t('common.send')}
          </Button>
        </>
      )}
    </div>
  );
}
