import { useAppSelector } from 'src/store/hooks';
import { selectSerialNumber } from 'src/store/selectors';
import { AiLicenseSettings, validateSerialNumber } from './AiLicenseSettings';

export function AiSettings() {
  const serialNumber = useAppSelector(selectSerialNumber);

  return (
    <div className="flex flex-col gap-4">
      {!validateSerialNumber(serialNumber) ? (
        <AiLicenseSettings />
      ) : (
        <div>
          <p className="m-0 text-sm">AI integration is currently in active development...</p>
        </div>
      )}
    </div>
  );
}
