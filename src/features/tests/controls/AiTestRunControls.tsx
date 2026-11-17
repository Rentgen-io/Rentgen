import { useAppSelector } from 'src/store/hooks';
import { selectRunningAiTests } from 'src/store/selectors';
import { executeAiTest } from 'src/test-engine';
import TestRunControls from './TestRunControls';

export default function AiTestRunControls({ name }: { name: string }) {
  const isRunning = useAppSelector((state) => Boolean(selectRunningAiTests(state)[name]));

  return <TestRunControls isRunning={isRunning} executeTest={() => executeAiTest(name)} />;
}
