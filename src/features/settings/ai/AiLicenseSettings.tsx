import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Textarea from 'src/components/inputs/Textarea';
import { useLicense } from 'src/hooks/useLicense';
import { useAppDispatch } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/uiSlice';
import { showLicenseMessage } from 'src/utils';
import SettingsHeader from '../SettingsHeader';

const RENTGEN_LICENSE_ANNUAL_PRICE = 36;
const RENTGEN_LICENSE_MONTHLY_PRICE = 3;

export function AiLicenseSettings() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { license, validateLicense } = useLicense();

  const [licenseKey, setLicenseKey] = useState<string>('');

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader>{t('settings.ai.unlockTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">
        {t('settings.ai.unlockDescription')}
        {!license.trialUsed ? ` ${t('settings.ai.tryFree')}` : ''}
      </p>
      <div className="md:flex border border-border dark:border-dark-border divide-y md:divide-y-0 md:divide-x divide-border dark:divide-dark-border overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 p-4">
          <label className="text-lg font-bold">Rentgen Pro</label>
          <div className="flex flex-col gap-2">
            <span className="text-2xl font-bold">
              €{RENTGEN_LICENSE_MONTHLY_PRICE}
              <span className="font-normal text-text-secondary lowercase">/{t('settings.ai.month')}</span>
            </span>
            <span className="text-xs text-text-secondary">
              {t('settings.ai.billedAnnually', { price: RENTGEN_LICENSE_ANNUAL_PRICE })}
            </span>
          </div>
          {!license.trialUsed && (
            <Button
              onClick={() =>
                openExternal(
                  "mailto:liudas@rentgen.io?subject=Rentgen%20Pro%20-%20Free%20Trial%20Request&body=Hi%20Liudas%2C%0A%0AI'd%20like%20to%20try%20Rentgen%20Pro.%20Could%20you%20please%20send%20me%20a%20free%20trial%20license%3F%0A%0ACompany%3A%0A%0AThanks!",
                )
              }
            >
              {t('settings.ai.startFreeTrial')}
            </Button>
          )}
          <Button
            buttonType={!license.trialUsed ? ButtonType.SECONDARY : ButtonType.PRIMARY}
            onClick={() => openExternal('https://buy.stripe.com/6oU9AL66N2hj6Rf9ZX1Jm04')}
          >
            {t('settings.ai.buyPro', { price: RENTGEN_LICENSE_MONTHLY_PRICE })}
          </Button>
          <span className="text-xs text-text-secondary">
            {t('settings.ai.oneAnnualPayment', { price: RENTGEN_LICENSE_ANNUAL_PRICE })}
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-4 p-4">
          <label className="text-sm font-bold">{t('settings.ai.alreadyHaveLicenseKey')}</label>
          <div className="flex flex-col flex-auto gap-2">
            <FieldLabel label={t('settings.ai.licenseKey')} required />
            <Textarea className="flex-auto" onChange={(e) => setLicenseKey(e.target.value)} />
          </div>
          <Button
            buttonType={ButtonType.SECONDARY}
            disabled={!licenseKey}
            onClick={async () => {
              const result = await validateLicense(licenseKey, false);
              showLicenseMessage(result);

              if (result.valid) dispatch(uiActions.setShowLicenseSettings(false));
            }}
          >
            {license.valid || license.status === 'expired'
              ? t('settings.ai.reactivateLicense')
              : t('settings.ai.activateLicense')}
          </Button>
        </div>
      </div>
    </div>
  );
}
