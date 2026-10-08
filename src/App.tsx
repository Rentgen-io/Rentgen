import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useCtrlS } from './hooks/useCtrlS';
import { useInitialDataLoad } from './hooks/useInitialDataLoad';
import { useRunResultSync } from './hooks/useRunResultSync';
import { useSaveRequest } from './hooks/useSaveRequest';
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
  selectTestResultsToCompare,
} from './store/selectors';
import { environmentActions } from './store/slices/environmentSlice';
import { testsActions } from './store/slices/testsSlice';

import ClearCrossIcon from './assets/icons/clear-cross-icon.svg';

export default function App() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const isEditingEnvironment = useAppSelector(selectIsEditingEnvironment);
  const editingEnvironmentId = useAppSelector(selectEditingEnvironmentId);
  const environments = useAppSelector(selectEnvironments);
  const isComparingTestResults = useAppSelector(selectIsComparingTestResults);
  const compareResponse = useAppSelector(selectCompareResponse);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);
  const testResults = useAppSelector(selectCurrentTestResults);
  const mode = useAppSelector(selectMode);
  const disabled = useAppSelector(selectIsRequestDisabled);

  const parametersRef = useRef<HTMLDivElement | null>(null);
  const { saveRequest } = useSaveRequest();

  useInitialDataLoad();
  useWssEventBridge();
  useRunResultSync();
  useCtrlS(!disabled ? saveRequest : undefined);

  return (
    <div className="flex">
      <Sidebar />
      <div className="@container flex-1 min-w-0 flex flex-col gap-4 p-4 overflow-y-auto">
        {isEditingEnvironment && (
          <div className="relative">
            <EnvironmentEditor
              environment={environments.find(({ id }) => id === editingEnvironmentId) || null}
              isNew={editingEnvironmentId === null}
              onSave={(environment) => dispatch(environmentActions.updateEnvironment(environment))}
            />
            <IconButton
              className="absolute top-1.5 right-1.5"
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
              onClick={() => dispatch(testsActions.clearResultsToCompare())}
            >
              <ClearCrossIcon className="h-5 w-5" />
            </IconButton>
          </div>
        )}
        {!isEditingEnvironment && !isComparingTestResults && (
          <>
            <RequestModeBar />
            <RequestUrlBar />
            <RequestEditors />

            {mode === 'HTTP' && <HttpResponsePanel parametersRef={parametersRef} />}
            <WssMessagesPanel />
            {mode === 'HTTP' && <TestRunnerBar />}

            {testResults && (
              <>
                <AiTestingPanel />
                <SecurityTestsPanel />
                <PerformanceInsightsPanel />
                <DataDrivenTestsPanel />
                <CrudTestsPanel />
              </>
            )}
          </>
        )}
      </div>
      <AppModals parametersRef={parametersRef} />
    </div>
  );
}
