import cn from 'classnames';
import { useEffect, useState } from 'react';
import { useLicense } from 'src/hooks/useLicense';
import { AiLicenseSettings } from './AiLicenseSettings';
import { AiProviderSettings } from './AiProviderSettings';
import { useTranslation } from 'react-i18next';

export function AiSettings() {
  const { license, validateLicense } = useLicense();
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    validateLicense(license?.key ?? null).then((info) => {
      if (!cancelled) setIsLicenseValid(info?.valid ?? false);
    });

    return () => {
      cancelled = true;
    };
  }, [license?.key]);

  if (isLicenseValid === null) return null;
  return (
    <div className="flex-1 flex flex-col justify-between gap-4">
      {isLicenseValid ? <AiProviderSettings /> : <AiLicenseSettings />}
      <LicenseFooter />
    </div>
  );
}

function LicenseFooter() {
  const { t } = useTranslation();
  const { license } = useLicense();

  if (!license.valid && license.status !== 'expired') return null;

  const { daysLeft, expiresOn } = license.info;
  const expiry = new Date(expiresOn);
  const hasDate = !Number.isNaN(expiry.getTime());
  const expired = license.status === 'expired' || daysLeft < 0;
  const warning = !expired && daysLeft <= 7;

  return (
    <div className="flex gap-4 mt-t pt-4 border-t border-border dark:border-dark-border">
      <span
        className={cn('text-xs', {
          'text-red-500': expired,
          'text-yellow-500': warning,
          'text-green-500': !expired && !warning,
        })}
      >
        {!expired && '🔑'} {!expired && <>{t('settings.ai.licenseActive')} · </>}
        <strong>
          {expired
            ? t('settings.ai.expired')
            : daysLeft === 0
              ? t('settings.ai.expiresToday')
              : t('settings.ai.daysLeft', { count: daysLeft })}
        </strong>
        {hasDate && !expired && <> ({t('settings.ai.expiresOn', { date: expiry })})</>}
      </span>
    </div>
  );
}
