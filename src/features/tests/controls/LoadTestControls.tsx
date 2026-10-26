import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from 'src/components/inputs/Input';
import useTests from 'src/hooks/useTests';
import { useAppSelector } from 'src/store/hooks';
import { selectTestOptions } from 'src/store/selectors';
import { clamp } from 'src/utils';
import TestRunControls from './TestRunControls';

export default function LoadTestControls() {
  const { t } = useTranslation();
  const { isLoadTestRunning, executeLoadTest } = useTests();

  const testOptions = useAppSelector(selectTestOptions);

  const [threadCount, setThreadCount] = useState<number>(10);
  const [requestCount, setRequestCount] = useState<number>(100);

  if (!testOptions) return null;

  return (
    <TestRunControls
      isRunning={isLoadTestRunning}
      executeTest={() => executeLoadTest(testOptions, threadCount, requestCount)}
    >
      <div>
        <label className="block mb-0.5 font-bold text-[10px]">{t('controls.threads')}</label>
        <Input
          className="w-12 p-0.5 text-center"
          title={t('controls.threadsMax')}
          type="number"
          value={threadCount}
          onChange={(event) => setThreadCount(clamp(Number(event.target.value), 1, 100))}
        />
      </div>

      <div>
        <label className="block mb-0.5 font-bold text-[10px]">{t('controls.requests')}</label>
        <Input
          className="w-16 p-0.5 text-center"
          type="number"
          title={t('controls.requestsMax')}
          value={requestCount}
          onChange={(event) => setRequestCount(clamp(Number(event.target.value), 1, 10000))}
        />
      </div>
    </TestRunControls>
  );
}
