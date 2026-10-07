import { useAppSelector } from 'src/store/hooks';
import { selectSerialNumber } from 'src/store/selectors';
import { AiLicenseSettings, validateSerialNumber } from './AiLicenseSettings';
import { AiProviderSettings } from './AiProviderSettings';

export function AiSettings() {
  const serialNumber = useAppSelector(selectSerialNumber);

  return (
    <div className="flex flex-col gap-4">
      {!validateSerialNumber(serialNumber) ? <AiLicenseSettings /> : <AiProviderSettings />}
    </div>
  );
}
