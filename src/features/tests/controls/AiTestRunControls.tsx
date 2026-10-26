import useTests from 'src/hooks/useTests';
import TestRunControls from './TestRunControls';

export default function AiTestRunControls({ name }: { name: string }) {
  const { runningAiTests, executeAiTest } = useTests();

  return <TestRunControls isRunning={Boolean(runningAiTests[name])} executeTest={() => executeAiTest(name)} />;
}
