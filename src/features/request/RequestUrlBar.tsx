import { Method } from 'axios';
import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ActionsButton from 'src/components/buttons/ActionsButton';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { CreatableSelect } from 'src/components/inputs/CreatableSelect';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import { SelectOption } from 'src/components/inputs/Select';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useSendHttpRequest } from 'src/hooks/useSendHttpRequest';
import { useWssActions } from 'src/hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectHighlightColor,
  selectIsRequestDisabled,
  selectMethod,
  selectMode,
  selectSelectedRequestId,
  selectUrl,
  selectVariableNames,
  selectWssConnected,
} from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';

const methodOptions: SelectOption<Method, string>[] = [
  { value: 'GET', label: 'GET', className: 'text-method-get!' },
  { value: 'POST', label: 'POST', className: 'text-method-post!' },
  { value: 'PUT', label: 'PUT', className: 'text-method-put!' },
  { value: 'PATCH', label: 'PATCH', className: 'text-method-patch!' },
  { value: 'DELETE', label: 'DELETE', className: 'text-method-delete!' },
  { value: 'HEAD', label: 'HEAD', className: 'text-method-head!' },
  { value: 'QUERY', label: 'QUERY', className: 'text-method-query!' },
  { value: 'OPTIONS', label: 'OPTIONS', className: 'text-method-options!' },
];

export default function RequestUrlBar() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const mode = useAppSelector(selectMode);
  const method = useAppSelector(selectMethod);
  const url = useAppSelector(selectUrl);
  const disabled = useAppSelector(selectIsRequestDisabled);
  const highlightColor = useAppSelector(selectHighlightColor);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const variables = useAppSelector(selectVariableNames);
  const wssConnected = useAppSelector(selectWssConnected);

  const { saveRequest, autoSaveRequest } = useSaveRequest();
  const { isSending, abortRequest, sendHttpRequest } = useSendHttpRequest();
  const { connect, disconnect, send } = useWssActions();

  const isHttpMode = mode === 'HTTP';

  const methodValue = useMemo(
    () => methodOptions.find((option) => option.value === method) ?? { value: method, label: method },
    [method],
  );

  return (
    <div className="flex flex-col @lg:flex-row @lg:items-center gap-2 py-3 px-4 border-0">
      <div
        className="flex-auto flex items-center"
        onKeyDown={(event) => {
          if (isHttpMode && event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !disabled && !isSending) {
            event.preventDefault();
            sendHttpRequest();
          }
        }}
      >
        {isHttpMode && (
          <CreatableSelect
            className="max-w-27.5 font-bold uppercase"
            classNames={{
              control: () => 'border-r-0! rounded-r-none!',
              input: () => '[&>:first-child]:uppercase',
            }}
            menuPosition="absolute"
            options={methodOptions}
            placeholder={t('request.methodPlaceholder')}
            value={methodValue}
            onBlur={autoSaveRequest}
            onChange={(option) => {
              if (option) dispatch(requestActions.setMethod(option.value.toUpperCase() as Method));
            }}
          />
        )}
        <HighlightedInput
          className={cn('flex-auto', { 'rounded-l-none': isHttpMode })}
          highlightColor={highlightColor}
          placeholder={t('request.enterUrl')}
          value={url}
          variables={variables}
          onBlur={autoSaveRequest}
          onChange={(event) => dispatch(requestActions.setUrl(event.target.value))}
        />
      </div>
      {isHttpMode && (
        <>
          {isSending ? (
            <Button buttonType={ButtonType.SECONDARY} onClick={abortRequest}>
              {t('common.cancel')}
            </Button>
          ) : (
            <Button disabled={disabled} title={`${t('common.send')} (⌘ / Ctrl + Enter)`} onClick={sendHttpRequest}>
              {t('common.send')}
            </Button>
          )}
          <ActionsButton
            actions={
              selectedRequestId
                ? [{ label: t('common.duplicate'), onClick: () => saveRequest({ duplicate: true }) }]
                : []
            }
            buttonType={ButtonType.SECONDARY}
            disabled={disabled}
            onClick={() => saveRequest()}
          >
            {t('common.save')}
          </ActionsButton>
        </>
      )}
      {!isHttpMode && (
        <>
          <Button
            buttonType={wssConnected ? ButtonType.SECONDARY : ButtonType.PRIMARY}
            disabled={!wssConnected && !url}
            onClick={wssConnected ? disconnect : connect}
          >
            {wssConnected ? t('common.disconnect') : t('common.connect')}
          </Button>
          <Button
            buttonType={wssConnected ? ButtonType.PRIMARY : ButtonType.SECONDARY}
            disabled={!wssConnected}
            onClick={send}
          >
            {t('common.send')}
          </Button>
        </>
      )}
    </div>
  );
}
