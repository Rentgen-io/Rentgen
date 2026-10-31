import { useTranslation } from 'react-i18next';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Loader from 'src/components/loaders/Loader';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useReportExport } from 'src/hooks/useReportExport';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectBodyParameters,
  selectCurrentTestResults,
  selectDynamicVariables,
  selectExportFormat,
  selectHeaders,
  selectHttpResponse,
  selectMethod,
  selectIsSending,
  selectQueryParameters,
  selectSelectedEnvironment,
  selectStatusCode,
  selectTestResultsToCompare,
  selectUrl,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { ReportFormat } from 'src/types';
import { substituteRequestVariables } from 'src/utils';

export default function TestRunnerBar() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { exportReport, generateCertificate } = useReportExport();
  const {
    currentTest,
    isRunningTests,
    testsCount,
    executeAllTests,
    cancelAllTests,
    isAiTestsRunning,
    aiRunStartedAt,
  } = useTests();
  const busy = isRunningTests || isAiTestsRunning || Boolean(aiRunStartedAt);

  const url = useAppSelector(selectUrl);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const method = useAppSelector(selectMethod);
  const isSending = useAppSelector(selectIsSending);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const httpResponse = useAppSelector(selectHttpResponse);
  const statusCode = useAppSelector(selectStatusCode);
  const testResults = useAppSelector(selectCurrentTestResults);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);
  const exportFormat = useAppSelector(selectExportFormat);

  const exportFormatOptions: SelectOption<ReportFormat>[] = [
    { value: 'json', label: t('exportFormats.json') },
    { value: 'md', label: t('exportFormats.markdown') },
    { value: 'csv', label: t('exportFormats.csv') },
  ];

  const canGenerate = Boolean(
    httpResponse && statusCode >= RESPONSE_STATUS.OK && statusCode < RESPONSE_STATUS.BAD_REQUEST,
  );

  return (
    <section className="test-runner-section" aria-labelledby="test-runner-heading">
      <div className="test-runner-heading">
        <div>
          <h2 id="test-runner-heading">{t('ai.tests')}</h2>
          {!canGenerate && <p id="test-generation-hint">{t(httpResponse ? 'ux.testsUnavailable' : 'ux.testsHint')}</p>}
        </div>
        {isRunningTests && (
          <span className="test-run-status" role="status">
            <Loader className="h-3.5 w-3.5 shrink-0 [&>span]:border-2!" />
            {t('tests.runningTests', { current: currentTest, total: testsCount })}
          </span>
        )}
      </div>
      <div className="test-runner-actions">
        <div className="test-runner-primary">
          <Button
            className="@xl:shrink-0 @xl:whitespace-nowrap"
            disabled={busy || isSending || !canGenerate}
            aria-describedby={!canGenerate ? 'test-generation-hint' : undefined}
            onClick={() => {
              dispatch(uiActions.setTestsActiveTab(1));
              executeAllTests({
                ...substituteRequestVariables(url, headers, body, selectedEnvironment, dynamicVariables),
                bodyParameters,
                method,
                queryParameters,
              });
            }}
          >
            {isRunningTests
              ? t('tests.runningTests', { current: currentTest, total: testsCount })
              : t('tests.generateAndRun')}
          </Button>
          {busy && (
            <Button buttonType={ButtonType.SECONDARY} onClick={cancelAllTests}>{t('common.cancel')}</Button>
          )}
          {testResults && (
            <Button
              className="@xl:shrink-0"
              buttonType={ButtonType.SECONDARY}
              disabled={busy}
              onClick={() => {
                dispatch(testsActions.addResultToCompare(testResults));
                if (testResultsToCompare.length < 1) dispatch(testsActions.setCompareResponse(httpResponse));
              }}
            >
              {testResultsToCompare.length < 1 ? t('tests.selectForCompare') : t('tests.compareWithSelected')}
            </Button>
          )}
        </div>

        {testResults && (
          <div className="test-runner-secondary">
            <div className="test-export-actions">
              <Select
                isSearchable={false}
                options={exportFormatOptions}
                aria-label={t('tests.formatPlaceholder')}
                placeholder={t('tests.formatPlaceholder')}
                value={exportFormatOptions.find((option) => option.value === exportFormat)}
                onChange={(option) => option && dispatch(uiActions.setExportFormat(option.value))}
              />
              <Button
                buttonType={ButtonType.SECONDARY}
                className="min-w-28"
                disabled={busy}
                onClick={exportReport}
              >
                {t('ux.exportReport')}
              </Button>
            </div>
            <Button
              className="@xl:shrink-0"
              buttonType={ButtonType.SECONDARY}
              disabled={busy}
              onClick={generateCertificate}
            >
              {t('tests.generateCertificate')}
            </Button>
          </div>
        )}
      </div>
      {isRunningTests && testsCount > 0 && (
        <progress
          className="test-run-progress"
          aria-label={t('tests.runningTests', { current: currentTest, total: testsCount })}
          value={Math.min(currentTest, testsCount)}
          max={testsCount}
        />
      )}
    </section>
  );
}
