import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { twMerge } from 'tailwind-merge';
import { IconButton } from './components/buttons/IconButton';
import Loader from './components/loaders/Loader';
import EnvironmentEditor from './features/environment/EnvironmentEditor';
import AppModals from './features/modals/AppModals';
import RequestDetails from './features/request/RequestDetails';
import RequestEditors from './features/request/RequestEditors';
import RequestModeBar from './features/request/RequestModeBar';
import RequestUrlBar from './features/request/RequestUrlBar';
import HttpResponsePanel from './features/response/HttpResponsePanel';
import WssMessagesPanel from './features/response/WssMessagesPanel';
import Sidebar from './features/sidebar/Sidebar';
import AiTestingPanel from './features/tests/panels/AiTestingPanel';
import CrudTestsPanel from './features/tests/panels/CrudTestsPanel';
import DataDrivenTestsPanel from './features/tests/panels/DataDrivenTestsPanel';
import PerformanceInsightsPanel from './features/tests/panels/PerformanceInsightsPanel';
import SecurityTestsPanel from './features/tests/panels/SecurityTestsPanel';
import TestResultsComparisonPanel from './features/tests/panels/TestResultsComparisonPanel';
import TestRunnerBar from './features/tests/TestRunnerBar';
import { useCtrlS } from './hooks/useCtrlS';
import { useInitialDataLoad } from './hooks/useInitialDataLoad';
import { useRunResultSync } from './hooks/useRunResultSync';
import { useSaveRequest } from './hooks/useSaveRequest';
import useTests from './hooks/useTests';
import { useWssEventBridge } from './hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  selectCompareResponse,
  selectCurrentTestResults,
  selectDisabledPerformanceInsights,
  selectDisabledSecurityTests,
  selectEditingEnvironmentId,
  selectEnvironments,
  selectIsComparingTestResults,
  selectIsEditingEnvironment,
  selectIsRequestDisabled,
  selectMode,
  selectTestResultsToCompare,
  selectTestsActiveTab,
} from './store/selectors';
import { environmentActions } from './store/slices/environmentSlice';
import { testsActions } from './store/slices/testsSlice';
import { uiActions } from './store/slices/uiSlice';
import { getTestsStatistics } from './test-engine';

import ClearCrossIcon from './assets/icons/clear-cross-icon.svg';

export default function App() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const {
    aiRunStartedAt,
    aiTests,
    crudTests,
    dataDrivenTests,
    isDataDrivenRunning,
    isPerformanceRunning,
    isSecurityRunning,
    performanceTests,
    securityTests,
  } = useTests();

  const compareResponse = useAppSelector(selectCompareResponse);
  const disabled = useAppSelector(selectIsRequestDisabled);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const editingEnvironmentId = useAppSelector(selectEditingEnvironmentId);
  const environments = useAppSelector(selectEnvironments);
  const isComparingTestResults = useAppSelector(selectIsComparingTestResults);
  const isEditingEnvironment = useAppSelector(selectIsEditingEnvironment);
  const mode = useAppSelector(selectMode);
  const testResults = useAppSelector(selectCurrentTestResults);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);
  const testsActiveTab = useAppSelector(selectTestsActiveTab);

  const testsTabs = useMemo(
    () => [
      {
        component: <AiTestingPanel />,
        isRunning: Boolean(aiRunStartedAt),
        label: t('tests.aiTesting'),
        tests: aiTests,
      },
      {
        component: <SecurityTestsPanel />,
        disabledTests: disabledSecurityTests,
        isRunning: isSecurityRunning,
        label: t('tests.securityTests'),
        tests: securityTests,
      },
      {
        component: <PerformanceInsightsPanel />,
        disabledTests: disabledPerformanceInsights,
        isRunning: isPerformanceRunning,
        label: t('tests.performanceInsights'),
        tests: performanceTests,
      },
      {
        component: <DataDrivenTestsPanel />,
        isRunning: isDataDrivenRunning,
        label: t('tests.dataDrivenTests'),
        tests: dataDrivenTests,
      },
      {
        component: <CrudTestsPanel />,
        isRunning: isSecurityRunning,
        label: t('tests.crud'),
        tests: crudTests,
      },
    ],
    [
      aiRunStartedAt,
      aiTests,
      crudTests,
      dataDrivenTests,
      disabledSecurityTests,
      isDataDrivenRunning,
      isPerformanceRunning,
      isSecurityRunning,
      performanceTests,
      securityTests,
      t,
    ],
  );

  const { saveRequest } = useSaveRequest();
  useInitialDataLoad();
  useWssEventBridge();
  useRunResultSync();
  useCtrlS(!disabled ? saveRequest : undefined);

  return (
    <div className="flex">
      <Sidebar />
      <div className="@container flex-1 min-w-0 flex flex-col">
        {isEditingEnvironment && (
          <EnvironmentEditor
            environment={environments.find(({ id }) => id === editingEnvironmentId) || null}
            isNew={editingEnvironmentId === null}
            onSave={(environment) => dispatch(environmentActions.updateEnvironment(environment))}
          />
        )}
        {!isEditingEnvironment && isComparingTestResults && compareResponse && (
          <div className="relative flex flex-col flex-auto">
            <TestResultsComparisonPanel
              items={testResultsToCompare}
              response={compareResponse}
              title={t('comparison.title')}
            />
            <IconButton
              className="absolute top-1.5 right-1.5"
              onClick={() => dispatch(testsActions.clearResultsToCompare())}
            >
              <ClearCrossIcon className="h-5 w-5" />
            </IconButton>
          </div>
        )}
        {!isEditingEnvironment && !isComparingTestResults && (
          <div className={cn('flex flex-col divide-y divide-border', { 'flex-auto': mode === 'WSS' })}>
            <RequestDetails />
            <RequestModeBar />
            <div className="border-0">
              <RequestUrlBar />
            </div>
            <RequestEditors />

            {mode === 'HTTP' && <HttpResponsePanel />}
            {mode === 'WSS' && <WssMessagesPanel />}
            {mode === 'HTTP' && (
              <div className="border-b border-border">
                <TestRunnerBar />
              </div>
            )}
          </div>
        )}
        {!isEditingEnvironment && !isComparingTestResults && testResults && (
          <Tabs
            className="flex flex-col flex-auto"
            forceRenderTabPanel
            selectedIndex={testsActiveTab}
            selectedTabClassName="text-foreground border-primary! cursor-default!"
            selectedTabPanelClassName="flex! flex-col flex-auto gap-4"
            onSelect={(index) => {
              dispatch(uiActions.setTestsActiveTab(index));
            }}
          >
            <TabList className="flex gap-4 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
              {testsTabs.map(({ disabledTests, isRunning, label, tests }) => {
                const { bugs, failed, passed, warnings } = getTestsStatistics(tests ?? [], disabledTests);

                return (
                  <Tab
                    key={label}
                    className="relative flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer"
                    title={label}
                  >
                    {isRunning ? (
                      <Loader className="h-4 w-4 shrink-0 [&>span]:border-2!" />
                    ) : (
                      <span
                        className={twMerge(
                          cn('w-2 h-2 rounded-full shrink-0 bg-gray-400', {
                            'bg-green-500': passed > 0 && failed === 0 && warnings === 0 && bugs === 0,
                            'bg-yellow-500': warnings > 0 && failed === 0 && bugs === 0,
                            'bg-red-500': failed > 0 && bugs === 0,
                            'bg-purple-500': bugs > 0,
                          }),
                        )}
                      />
                    )}

                    <span className="truncate">{label}</span>
                  </Tab>
                );
              })}
            </TabList>
            {testsTabs.map(({ component, label }) => (
              <TabPanel key={label} className="hidden min-h-51.5 py-3 px-4">
                {component}
              </TabPanel>
            ))}
          </Tabs>
        )}
      </div>
      <AppModals />
    </div>
  );
}
