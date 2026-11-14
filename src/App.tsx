import { ComponentType, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Loader from 'src/components/loaders/Loader';
import { TESTING_MODE_TAB_INDEX, TESTING_MODE_TABS, TestingModeTabId } from 'src/constants/testingModeTabs';
import EnvironmentEditor from 'src/features/environment/EnvironmentEditor';
import AppModals from 'src/features/modals/AppModals';
import PreEvaluationPanel from 'src/features/pre-evaluation/PreEvaluationPanel';
import RequestDetails from 'src/features/request/RequestDetails';
import RequestEditors from 'src/features/request/RequestEditors';
import RequestModeBar from 'src/features/request/RequestModeBar';
import RequestUrlBar from 'src/features/request/RequestUrlBar';
import HttpResponsePanel from 'src/features/response/HttpResponsePanel';
import WssMessagesPanel from 'src/features/response/WssMessagesPanel';
import Sidebar from 'src/features/sidebar/Sidebar';
import TestResultsComparisonPanel from 'src/features/tests/panels/TestResultsComparisonPanel';
import TestsPanel from 'src/features/tests/panels/TestsPanel';
import TestRunnerBar from 'src/features/tests/TestRunnerBar';
import { useCtrlS } from 'src/hooks/useCtrlS';
import { useInitialDataLoad } from 'src/hooks/useInitialDataLoad';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useWssEventBridge } from 'src/hooks/useWebSocket';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCompareResponse,
  selectEditingEnvironment,
  selectEditingEnvironmentId,
  selectHasTestResults,
  selectIsPreEvaluationRunning,
  selectIsRequestDisabled,
  selectIsRunningAnyTests,
  selectMainView,
  selectMode,
  selectTestingModeActiveTab,
  selectTestResultsToCompare,
} from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { Environment } from 'src/types';

/*
 * App is only the layout and the app-wide hooks: every part below selects the state it shows itself, so a change
 * re-renders that part only, not the whole tree (sidebar, editors, response...).
 */
export default function App() {
  const { saveRequest } = useSaveRequest();

  // Checked on key press, so the shortcut listener is added once and App doesn't subscribe to the flag
  const saveRequestShortcut = useCallback(() => {
    if (!selectIsRequestDisabled(store.getState())) saveRequest();
  }, [saveRequest]);

  useInitialDataLoad();
  useWssEventBridge();
  useCtrlS(saveRequestShortcut);

  return (
    <div className="flex">
      <Sidebar />
      <div className="@container flex flex-col flex-1 min-w-0 overscroll-contain">
        <MainView />
      </div>
      <AppModals />
    </div>
  );
}

function MainView() {
  const view = useAppSelector(selectMainView);

  if (view === 'environment') return <EnvironmentEditorView />;
  if (view === 'comparison') return <ComparisonView />;

  return <RequestView />;
}

function EnvironmentEditorView() {
  const dispatch = useAppDispatch();
  const editingEnvironmentId = useAppSelector(selectEditingEnvironmentId);
  const environment = useAppSelector(selectEditingEnvironment);

  const handleSave = useCallback(
    (environment: Environment) => dispatch(environmentActions.updateEnvironment(environment)),
    [dispatch],
  );

  return (
    <EnvironmentEditor
      key={editingEnvironmentId ?? 'new'}
      environment={environment}
      isNew={editingEnvironmentId === null}
      onSave={handleSave}
    />
  );
}

function ComparisonView() {
  const compareResponse = useAppSelector(selectCompareResponse);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);

  if (!compareResponse) return null;

  return <TestResultsComparisonPanel items={testResultsToCompare} response={compareResponse} />;
}

function RequestView() {
  const mode = useAppSelector(selectMode);

  return (
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
            <HttpResponseSection />
            <TestingModeTabs />
          </>
        )}
      </div>
    </>
  );
}

function HttpResponseSection() {
  const testingModeActiveTab = useAppSelector(selectTestingModeActiveTab);

  return <HttpResponsePanel showParameters={testingModeActiveTab === TESTING_MODE_TAB_INDEX.apiTesting} />;
}

function ApiTestingPanel() {
  const hasTestResults = useAppSelector(selectHasTestResults);

  return (
    <>
      <TestRunnerBar />
      {hasTestResults && <TestsPanel />}
    </>
  );
}

// Both stay mounted (forceRenderTabPanel) and select their own data: memo keeps the tab labels' re-renders out of them
const TESTING_MODE_PANELS: Record<TestingModeTabId, ComponentType> = {
  apiTesting: memo(ApiTestingPanel),
  preEvaluation: memo(PreEvaluationPanel),
};

function TestingModeTabs() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isRunningAnyTests = useAppSelector(selectIsRunningAnyTests);
  const isRunningPreEvaluation = useAppSelector(selectIsPreEvaluationRunning);
  const testingModeActiveTab = useAppSelector(selectTestingModeActiveTab);

  const isRunning: Record<TestingModeTabId, boolean> = {
    apiTesting: isRunningAnyTests,
    preEvaluation: isRunningPreEvaluation,
  };

  return (
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
        {TESTING_MODE_TABS.map(({ id, labelKey }) => (
          <Tab
            key={id}
            className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none truncate cursor-pointer"
          >
            {isRunning[id] && <Loader className="size-4 shrink-0 [&>span]:border-2!" />}
            <span className="truncate">{t(labelKey)}</span>
          </Tab>
        ))}
      </TabList>
      {TESTING_MODE_TABS.map(({ id }) => {
        const Panel = TESTING_MODE_PANELS[id];

        return (
          <TabPanel key={id} className="hidden">
            <Panel />
          </TabPanel>
        );
      })}
    </Tabs>
  );
}
