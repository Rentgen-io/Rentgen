import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Input from 'src/components/inputs/Input';
import { useAppDispatch } from 'src/store/hooks';
import { settingsActions } from 'src/store/slices/settingsSlice';
import SettingsHeader from '../SettingsHeader';

export function AiLicenseSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [serialNumber, setSerialNumber] = useState<string>('');

  return (
    <>
      <SettingsHeader>{t('settings.ai.unlockTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.ai.unlockDescription')}</p>
      <div className="md:flex border border-border dark:border-dark-border divide-y md:divide-y-0 md:divide-x divide-border dark:divide-dark-border overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 p-4">
          <label className="m-0 text-sm font-bold">{t('settings.ai.buyLicense')}</label>
          <div className="flex-auto flex flex-col gap-2">
            <span className="text-2xl font-bold">€79</span>
            <span className="text-xs text-text-secondary">{t('settings.ai.oneTimePayment')}</span>
          </div>
          <Button>{t('settings.ai.buyLicense')}</Button>
        </div>
        <div className="flex-1 flex flex-col gap-4 p-4">
          <label className="m-0 text-sm font-bold">{t('settings.ai.alreadyHaveSerialNumber')}</label>
          <div className="flex-auto flex flex-col gap-2">
            <span className="text-xs text-text-secondary">{t('settings.ai.serialNumber')}</span>
            <Input placeholder="RG-AI-XXXX-XXXX-XXXX" onChange={(e) => setSerialNumber(e.target.value)} />
          </div>
          <Button
            buttonType={ButtonType.SECONDARY}
            onClick={() => {
              if (validateSerialNumber(serialNumber)) dispatch(settingsActions.setSerialNumber(serialNumber));
              else toast.error(<span className="flex-auto">{t('settings.ai.invalidSerialNumber')}</span>);
            }}
          >
            {t('settings.ai.activateLicense')}
          </Button>
        </div>
      </div>
    </>
  );
}

export function validateSerialNumber(serialNumber: string | null) {
  // TODO: Implement proper serial number validation logic
  return serialNumber && serialNumber.length > 0;
}
