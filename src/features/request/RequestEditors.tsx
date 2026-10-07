import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import HighlightedTextarea from 'src/components/inputs/HighlightedTextarea';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectHeaders,
  selectMode,
  selectSelectedEnvironment,
  selectVariableNames,
} from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { formatBody, parseHeaders } from 'src/utils';

export default function RequestEditors() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const mode = useAppSelector(selectMode);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        '@2xl:divide-x @2xl:divide-border @2xl:bg-white @2xl:grid @2xl:grid-cols-2 @2xl:items-stretch @2xl:gap-0 @2xl:border @2xl:border-border',
        '@2xl:dark:divide-dark-body @2xl:dark:bg-dark-input @2xl:dark:border-dark-border',
      )}
    >
      <div>
        <label className="block mb-1 @2xl:p-3 @2xl:pb-0 font-bold text-sm">{t('request.headers')}</label>
        <HighlightedTextarea
          className="@2xl:border-none"
          highlightColor={selectedEnvironment?.color}
          maxRows={15}
          placeholder={t('request.headersPlaceholder')}
          value={headers}
          variables={variables}
          onBlur={autoSaveRequest}
          onChange={(event) => dispatch(requestActions.setHeaders(event.target.value))}
        />
      </div>

      <div className="@2xl:relative">
        <label className="block mb-1 @2xl:p-3 @2xl:pb-0 font-bold text-sm">{t('request.body')}</label>
        <div className="relative @2xl:static">
          <HighlightedTextarea
            className="@2xl:border-none"
            highlightColor={selectedEnvironment?.color}
            maxRows={15}
            placeholder={mode === 'HTTP' ? t('request.bodyPlaceholderHttp') : t('request.bodyPlaceholderWss')}
            value={body}
            variables={variables}
            onBlur={autoSaveRequest}
            onChange={(event) => dispatch(requestActions.setBody(event.target.value))}
          />
          <Button
            className="absolute top-3 right-4 z-10"
            buttonSize={ButtonSize.SMALL}
            buttonType={ButtonType.SECONDARY}
            onBlur={autoSaveRequest}
            onClick={() => dispatch(requestActions.setBody(formatBody(body, parseHeaders(headers))))}
          >
            {t('common.beautify')}
          </Button>
        </div>
      </div>
    </div>
  );
}
