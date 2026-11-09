import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Loader from './components/loaders/Loader';
import EnvironmentEditor from './features/environment/EnvironmentEditor';
import AppModals from './features/modals/AppModals';
import PreEvaluationPanel from './features/pre-evaluation/PreEvaluationPanel';
import RequestDetails from './features/request/RequestDetails';
import RequestEditors from './features/request/RequestEditors';
import RequestModeBar from './features/request/RequestModeBar';
import RequestUrlBar from './features/request/RequestUrlBar';
import HttpResponsePanel from './features/response/HttpResponsePanel';
import WssMessagesPanel from './features/response/WssMessagesPanel';
import Sidebar from './features/sidebar/Sidebar';
import TestResultsComparisonPanel from './features/tests/panels/TestResultsComparisonPanel';
import TestsPanel from './features/tests/panels/TestsPanel';
import TestRunnerBar from './features/tests/TestRunnerBar';
import { useCtrlS } from './hooks/useCtrlS';
import { useInitialDataLoad } from './hooks/useInitialDataLoad';
import usePreEvaluation from './hooks/usePreEvaluation';
import { useRunResultSync } from './hooks/useRunResultSync';
import { useSaveRequest } from './hooks/useSaveRequest';
import useTests from './hooks/useTests';
import { useWssEventBridge } from './hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  selectCompareResponse,
  selectCurrentTestResults,
  selectEditingEnvironmentId,
  selectEnvironments,
  selectIsComparingTestResults,
  selectIsEditingEnvironment,
  selectIsRequestDisabled,
  selectMode,
  selectTestingModeActiveTab,
  selectTestResultsToCompare,
} from './store/selectors';
import { environmentActions } from './store/slices/environmentSlice';
import { uiActions } from './store/slices/uiSlice';

export default function App() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { aiRunStartedAt, isAiTestsRunning, isRunningTests, runningAiTests } = useTests();
  const { isRunningPreEvaluation } = usePreEvaluation();

  const compareResponse = useAppSelector(selectCompareResponse);
  const disabled = useAppSelector(selectIsRequestDisabled);
  const editingEnvironmentId = useAppSelector(selectEditingEnvironmentId);
  const environments = useAppSelector(selectEnvironments);
  const isComparingTestResults = useAppSelector(selectIsComparingTestResults);
  const isEditingEnvironment = useAppSelector(selectIsEditingEnvironment);
  const mode = useAppSelector(selectMode);
  const testingModeActiveTab = useAppSelector(selectTestingModeActiveTab);
  const testResults = useAppSelector(selectCurrentTestResults);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);

  const { saveRequest } = useSaveRequest();
  useInitialDataLoad();
  useWssEventBridge();
  useRunResultSync();
  useCtrlS(!disabled ? saveRequest : undefined);

  const isRunningAnyTests =
    isRunningTests || isAiTestsRunning || Boolean(aiRunStartedAt) || Object.keys(runningAiTests).length > 0;

  const testingTabs = useMemo(
    () => [
      {
        component: (
          <>
            <TestRunnerBar />
            {testResults && <TestsPanel />}
          </>
        ),
        isRunning: isRunningAnyTests,
        label: t('tests.apiTesting'),
      },
      {
        component: <PreEvaluationPanel />,
        isRunning: isRunningPreEvaluation,
        label: t('preEvaluation.title'),
      },
    ],
    [isRunningAnyTests, isRunningPreEvaluation, testResults, t],
  );

  return (
    <div className="flex">
      <Sidebar />
      <div className="@container flex flex-col flex-1 min-w-0 overscroll-contain">
        {isEditingEnvironment && (
          <EnvironmentEditor
            environment={environments.find(({ id }) => id === editingEnvironmentId) || null}
            isNew={editingEnvironmentId === null}
            onSave={(environment) => dispatch(environmentActions.updateEnvironment(environment))}
          />
        )}
        {!isEditingEnvironment && isComparingTestResults && compareResponse && (
          <TestResultsComparisonPanel items={testResultsToCompare} response={compareResponse} />
        )}
        {!isEditingEnvironment && !isComparingTestResults && (
          <>
            <div className="sticky top-0 bg-background divide-y divide-border border-b border-border z-20">
              <RequestDetails />
              <RequestModeBar />
            </div>
            <div className="flex flex-col flex-auto divide-y divide-border">
              <RequestUrlBar />
              <RequestEditors />
              {mode === 'WSS' && <WssMessagesPanel />}
              {mode === 'HTTP' && (
                <>
                  <HttpResponsePanel showParameters={testingModeActiveTab === 0} />
                  <Tabs
                    className="flex flex-col flex-auto"
                    forceRenderTabPanel
                    selectedIndex={testingModeActiveTab}
                    selectedTabClassName="text-foreground border-primary! cursor-default!"
                    selectedTabPanelClassName="flex! flex-col flex-auto"
                    onSelect={(index) => {
                      dispatch(uiActions.setTestingModeActiveTab(index));
                    }}
                  >
                    <TabList className="flex gap-6 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
                      {testingTabs.map(({ isRunning, label }) => (
                        <Tab
                          key={label}
                          className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none truncate cursor-pointer"
                        >
                          {isRunning && <Loader className="h-4 w-4 shrink-0 [&>span]:border-2!" />}
                          <span className="truncate">{label}</span>
                        </Tab>
                      ))}
                    </TabList>
                    {testingTabs.map(({ component, label }) => (
                      <TabPanel key={label} className="hidden">
                        {component}
                      </TabPanel>
                    ))}
                  </Tabs>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <AppModals />
    </div>
  );
}
