import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Select, { SelectOption } from 'src/components/inputs/Select';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import ProgressBar from 'src/components/loaders/ProgressBar';
import { TESTS_TAB_INDEX } from 'src/constants/testsTabs';
import { useReportExport } from 'src/hooks/useReportExport';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectBodyParameters,
  selectCurrentTest,
  selectCurrentTestResults,
  selectDynamicVariables,
  selectExportFormat,
  selectHasHttpResponse,
  selectHasTestResults,
  selectHasTestResultsToCompare,
  selectHeaders,
  selectHttpResponse,
  selectIsAiBusy,
  selectIsResponseSuccessful,
  selectIsRunningTests,
  selectIsSending,
  selectMethod,
  selectQueryParameters,
  selectSelectedEnvironment,
  selectTestsCount,
  selectUrl,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { cancelAllTests, executeAllTests } from 'src/test-engine';
import { ReportFormat } from 'src/types';
import { substituteRequestVariables } from 'src/utils';

import ExportIcon from 'src/assets/icons/export-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';

export default function TestRunnerBar() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { exportReport, generateCertificate } = useReportExport();

  const exportFormat = useAppSelector(selectExportFormat);
  const hasHttpResponse = useAppSelector(selectHasHttpResponse);
  const hasTestResults = useAppSelector(selectHasTestResults);
  const hasTestResultsToCompare = useAppSelector(selectHasTestResultsToCompare);
  const isAiBusy = useAppSelector(selectIsAiBusy);
  const isResponseSuccessful = useAppSelector(selectIsResponseSuccessful);
  const isRunningTests = useAppSelector(selectIsRunningTests);
  const isSending = useAppSelector(selectIsSending);

  const exportFormatOptions: SelectOption<ReportFormat>[] = [
    { value: 'json', label: t('exportFormats.json') },
    { value: 'md', label: t('exportFormats.markdown') },
    { value: 'csv', label: t('exportFormats.csv') },
  ];

  const isRunning = isRunningTests || isAiBusy;

  const handleRun = () => {
    const state = store.getState();

    dispatch(uiActions.setTestsActiveTab(TESTS_TAB_INDEX.security));
    executeAllTests({
      ...substituteRequestVariables(
        selectBody(state),
        selectSelectedEnvironment(state),
        selectDynamicVariables(state),
        selectHeaders(state),
        selectUrl(state),
      ),
      bodyParameters: selectBodyParameters(state),
      method: selectMethod(state),
      queryParameters: selectQueryParameters(state),
    });
  };

  const handleAddToCompare = () => {
    const state = store.getState();
    const testResults = selectCurrentTestResults(state);
    if (!testResults) return;

    dispatch(testsActions.addResultToCompare(testResults));
    if (!hasTestResultsToCompare) dispatch(testsActions.setCompareResponse(selectHttpResponse(state)));
  };

  return (
    <div className="relative flex flex-col gap-4 bg-surface py-3 px-4 border-b border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-4">
          <h5 className="m-0">{t('tests.testsTitle')}</h5>
          {!isResponseSuccessful && (
            <p className="m-0 text-xs text-muted-foreground">
              {t(hasHttpResponse ? 'tests.testsUnavailable' : 'tests.testsHint')}
            </p>
          )}
        </div>
        {isRunningTests && <TestRunProgressText />}
      </div>
      <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-between gap-2">
        <div className="flex flex-col @xl:flex-row @xl:items-center gap-2 @xl:min-w-0">
          {!isRunningTests ? (
            <Button
              className="inline-flex items-center gap-2 @xl:truncate"
              disabled={isRunning || isSending || !isResponseSuccessful}
              onClick={handleRun}
            >
              <PlayIcon className="size-4 shrink-0" />
              <span className="@xl:truncate">{t('tests.generateAndRun')}</span>
            </Button>
          ) : (
            <Button className="inline-flex items-center gap-2 @xl:truncate" onClick={cancelAllTests}>
              <StopIcon className="size-4 shrink-0" />
              <span className="@xl:truncate">{t('common.stop')}</span>
            </Button>
          )}
          {hasTestResults && !isRunningTests && (
            <Button
              buttonType={ButtonType.SECONDARY_OUTLINE}
              className="@xl:truncate"
              disabled={isRunning}
              onClick={handleAddToCompare}
            >
              {hasTestResultsToCompare ? t('tests.compareWithSelected') : t('tests.selectForCompare')}
            </Button>
          )}
        </div>
        {hasTestResults && !isRunningTests && (
          <div className="flex flex-col @xl:flex-row @xl:justify-end @xl:items-center gap-4 @xl:gap-2 @xl:min-w-0">
            <div className="flex flex-col @xl:flex-row @xl:items-center gap-2">
              <Select
                isSearchable={false}
                options={exportFormatOptions}
                placeholder={t('tests.formatPlaceholder')}
                value={exportFormatOptions.find((option) => option.value === exportFormat)}
                onChange={(option) => option && dispatch(uiActions.setExportFormat(option.value))}
              />
              <Button
                buttonType={ButtonType.SECONDARY_OUTLINE}
                className="inline-flex items-center gap-2 truncate"
                disabled={isRunning}
                onClick={exportReport}
              >
                <ExportIcon className="size-4 shrink-0" />
                <span className="truncate">{t('common.export')}</span>
              </Button>
            </div>
            <Button
              buttonType={ButtonType.SECONDARY_OUTLINE}
              className="@xl:truncate"
              disabled={isRunning}
              onClick={generateCertificate}
            >
              {t('tests.generateCertificate')}
            </Button>
          </div>
        )}
      </div>
      {isRunningTests && <TestRunProgressBar />}
    </div>
  );
}

function TestRunProgressText() {
  const { t } = useTranslation();
  const currentTest = useAppSelector(selectCurrentTest);
  const testsCount = useAppSelector(selectTestsCount);

  return (
    <LoaderWithText
      className="w-auto text-xs font-normal [&_.loader]:size-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
      text={t('tests.runningTests', { current: currentTest, total: testsCount })}
    />
  );
}

function TestRunProgressBar() {
  const currentTest = useAppSelector(selectCurrentTest);
  const testsCount = useAppSelector(selectTestsCount);

  if (testsCount <= 0) return null;

  return <ProgressBar className="absolute bottom-0 left-0" max={testsCount} value={currentTest} />;
}
