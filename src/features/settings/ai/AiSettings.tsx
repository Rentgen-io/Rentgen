import { useEffect, useState } from 'react';
import { useAppSelector } from 'src/store/hooks';
import { selectLicenseKey } from 'src/store/selectors';
import { verifyLicense } from 'src/utils';
import { AiLicenseSettings } from './AiLicenseSettings';
import { AiProviderSettings } from './AiProviderSettings';

export function AiSettings() {
  const licenseKey = useAppSelector(selectLicenseKey);

  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    verifyLicense(licenseKey).then((result) => {
      if (!cancelled) setIsLicenseValid(result.valid);
    });

    return () => {
      cancelled = true;
    };
  }, [licenseKey]);

  if (isLicenseValid === null) return null;
  return <div className="flex flex-col gap-4">{isLicenseValid ? <AiProviderSettings /> : <AiLicenseSettings />}</div>;
}
