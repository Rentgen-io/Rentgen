import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controls } from '../../components/controls/Controls';
import Input from '../../components/inputs/Input';
import { clamp } from '../../utils';

const MAX_PAYLOAD_SIZE_MB = 100;

interface Props {
  isRunning: boolean;
  executeTest: (size: number) => Promise<void>;
}

export function LargePayloadTestControls({ isRunning, executeTest }: Props) {
  const { t } = useTranslation();
  const [size, setSize] = useState(10);

  return (
    <Controls isRunning={isRunning} executeTest={() => executeTest(size)}>
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
    </Controls>
  );
}
