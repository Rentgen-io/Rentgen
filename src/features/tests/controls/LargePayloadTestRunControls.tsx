import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from 'src/components/inputs/Input';
import useTests from 'src/hooks/useTests';
import { useAppSelector } from 'src/store/hooks';
import { selectTestOptions } from 'src/store/selectors';
import { clamp } from 'src/utils';
import TestRunControls from './TestRunControls';

const MAX_PAYLOAD_SIZE_MB = 100;

export default function LargePayloadTestRunControls() {
  const { t } = useTranslation();
  const { isLargePayloadTestRunning, executeLargePayloadTest } = useTests();

  const testOptions = useAppSelector(selectTestOptions);

  const [size, setSize] = useState<number>(10);

  if (!testOptions) return null;

  return (
    <TestRunControls
      isRunning={isLargePayloadTestRunning}
      executeTest={() => executeLargePayloadTest(testOptions, size)}
    >
      <div>
        <label className="block mb-0.5 font-bold text-[10px]">{t('controls.sizeMB')}</label>
        <Input
          className="w-16 p-0.5 text-center"
          type="number"
          title={t('controls.sizeMax', { max: MAX_PAYLOAD_SIZE_MB })}
          value={size}
          onChange={(event) => setSize(clamp(Number(event.target.value), 1, MAX_PAYLOAD_SIZE_MB))}
        />
      </div>
    </TestRunControls>
  );
}
