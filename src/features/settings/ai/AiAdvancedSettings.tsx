import { useTranslation } from 'react-i18next';
import { AI_API_CONTEXT_MAX_LENGTH } from 'shared/types/settings';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Textarea from 'src/components/inputs/Textarea';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectAiApiContext } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import SettingsHeader from '../SettingsHeader';

export function AiAdvancedSettings() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const apiContext = useAppSelector(selectAiApiContext);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader>{t('settings.ai.advancedTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-muted-foreground">{t('settings.ai.advancedDescription')}</p>
      <div className="flex flex-col gap-2">
        <FieldLabel label={t('settings.ai.apiContext')} />
        <Textarea
          maxLength={AI_API_CONTEXT_MAX_LENGTH}
          placeholder={t('settings.ai.apiContextPlaceholder')}
          rows={6}
          value={apiContext}
          onChange={(event) => dispatch(settingsActions.setAiApiContext(event.target.value))}
        />
        <span className="self-end text-xs text-muted-foreground">
          {apiContext.length} / {AI_API_CONTEXT_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
