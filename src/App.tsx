import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { twMerge } from 'tailwind-merge';
import { IconButton } from './components/buttons/IconButton';
import EnvironmentEditor from './features/environment/EnvironmentEditor';
import AppModals from './features/modals/AppModals';
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
import TestResultsSummary from './features/tests/TestResultsSummary';
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
  selectMethod,
  selectSelectedRequestWithFolder,
  selectTestResultsToCompare,
  selectTestsActiveTab,
} from './store/selectors';
import { environmentActions } from './store/slices/environmentSlice';
import { testsActions } from './store/slices/testsSlice';
import { getTestsStatistics } from './test-engine';

import MethodBadge from './components/badges/MethodBadge';
import ClearCrossIcon from './assets/icons/clear-cross-icon.svg';
import Loader from './components/loaders/Loader';
import { uiActions } from './store/slices/uiSlice';

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
    isRunningTests,
    isAiTestsRunning,
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
  const method = useAppSelector(selectMethod);
  const selectedRequest = useAppSelector(selectSelectedRequestWithFolder);
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
      disabledPerformanceInsights,
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
    <div className="app-shell">
      <div className="app-workbench">
        <Sidebar />
        <div className="@container app-main flex-1 min-w-0 flex flex-col overflow-y-auto" id="main-workbench">
          {isEditingEnvironment && (
            <div className="relative flex flex-col flex-auto">
              <EnvironmentEditor
                environment={environments.find(({ id }) => id === editingEnvironmentId) || null}
                isNew={editingEnvironmentId === null}
                onSave={(environment) => dispatch(environmentActions.updateEnvironment(environment))}
              />
              <IconButton
                className="absolute top-1.5 right-1.5"
                aria-label={t('common.close')}
                onClick={() => dispatch(environmentActions.stopEditing())}
              >
                <ClearCrossIcon className="h-5 w-5" />
              </IconButton>
            </div>
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
                aria-label={t('common.close')}
                onClick={() => dispatch(testsActions.clearResultsToCompare())}
              >
                <ClearCrossIcon className="h-5 w-5" />
              </IconButton>
            </div>
          )}
          {!isEditingEnvironment && !isComparingTestResults && (
            <div className="request-workbench flex flex-col">
              <div className="request-document-bar">
                <MethodBadge method={mode === 'HTTP' ? method : mode} />
                <span className="truncate">{selectedRequest?.request.name || t('ux.requestTitle')}</span>
                {selectedRequest && <span className="request-document-folder">{selectedRequest.folder.name}</span>}
              </div>
              <>
                <RequestModeBar />
                <RequestUrlBar />
                <RequestEditors key={mode} />

                {mode === 'HTTP' && <HttpResponsePanel />}
                <WssMessagesPanel />
                {mode === 'HTTP' && <TestRunnerBar />}
              </>
            </div>
          )}
          {!isEditingEnvironment && !isComparingTestResults && testResults && (
            <>
              <TestResultsSummary
                suites={testsTabs}
                isRunning={isRunningTests || isAiTestsRunning || Boolean(aiRunStartedAt)}
                onReview={(index) => {
                  dispatch(uiActions.setTestsActiveTab(index));
                  requestAnimationFrame(() => {
                    const tab = document.querySelector<HTMLElement>(
                      '#test-results-detail [role="tab"][aria-selected="true"]',
                    );
                    tab?.focus({ preventScroll: true });
                    tab?.scrollIntoView({ block: 'start', behavior: 'instant' });
                  });
                }}
              />
              <Tabs
                id="test-results-detail"
                className="tests-detail flex flex-col flex-auto"
                forceRenderTabPanel={true}
                selectedIndex={testsActiveTab}
                selectedTabClassName="test-category-active"
                selectedTabPanelClassName="flex! flex-col flex-auto gap-4"
                onSelect={(index) => {
                  dispatch(uiActions.setTestsActiveTab(index));
                }}
              >
                <TabList className="tests-category-tabs flex m-0 px-4 text-sm font-medium border-b border-border dark:border-dark-body">
                  {testsTabs.map(({ disabledTests, isRunning, label, tests }) => {
                    const { bugs, failed, passed, warnings } = getTestsStatistics(tests ?? [], disabledTests);

                    return (
                      <Tab key={label} className="test-category" title={label}>
                        {isRunning ? (
                          <Loader className="h-4 w-4 shrink-0 [&>span]:border-2!" />
                        ) : (
                          <span
                            className={twMerge(
                              cn('w-2 h-2 m-1 rounded-full shrink-0 bg-gray-400', {
                                'bg-green-500': passed > 0 && failed === 0 && warnings === 0 && bugs === 0,
                                'bg-yellow-500': warnings > 0 && failed === 0 && bugs === 0,
                                'bg-red-500': failed > 0 && bugs === 0,
                                'bg-purple-500': bugs > 0,
                              }),
                            )}
                          />
                        )}

                        <span className="truncate">{label}</span>
                        {bugs + failed + warnings > 0 && (
                          <span className="test-category-count" aria-label={`${t('common.bugs')}: ${bugs}, ${t('common.failed')}: ${failed}, ${t('common.warnings')}: ${warnings}`}>
                            {bugs + failed + warnings}
                          </span>
                        )}
                      </Tab>
                    );
                  })}
                </TabList>
                {testsTabs.map(({ component, label }) => (
                  <TabPanel key={label} className="hidden min-h-51.5 p-4 bg-white dark:bg-dark-input">
                    {component}
                  </TabPanel>
                ))}
              </Tabs>
            </>
          )}
        </div>
      </div>
      <AppModals />
    </div>
  );
}
