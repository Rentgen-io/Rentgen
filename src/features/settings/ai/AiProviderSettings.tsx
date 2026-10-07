import { useTranslation } from 'react-i18next';
import SettingsHeader from '../SettingsHeader';

export function AiProviderSettings() {
  const { t } = useTranslation();

  return (
    <>
      <SettingsHeader>{t('settings.ai.connectTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.ai.connectDescription')}</p>
      <p className="m-0 text-sm">AI integration is currently in active development...</p>
    </>
  );
}
