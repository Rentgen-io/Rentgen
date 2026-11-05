import { useTranslation } from 'react-i18next';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Select, { SelectOption } from 'src/components/inputs/Select';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import ProgressBar from 'src/components/loaders/ProgressBar';
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
  selectIsSending,
  selectMethod,
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

import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';

export default function TestRunnerBar() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { exportReport, generateCertificate } = useReportExport();
  const { aiRunStartedAt, currentTest, isAiTestsRunning, isRunningTests, testsCount, cancelAllTests, executeAllTests } =
    useTests();

  const body = useAppSelector(selectBody);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const exportFormat = useAppSelector(selectExportFormat);
  const headers = useAppSelector(selectHeaders);
  const httpResponse = useAppSelector(selectHttpResponse);
  const isSending = useAppSelector(selectIsSending);
  const method = useAppSelector(selectMethod);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const statusCode = useAppSelector(selectStatusCode);
  const testResults = useAppSelector(selectCurrentTestResults);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);
  const url = useAppSelector(selectUrl);

  const exportFormatOptions: SelectOption<ReportFormat>[] = [
    { value: 'json', label: t('exportFormats.json') },
    { value: 'md', label: t('exportFormats.markdown') },
    { value: 'csv', label: t('exportFormats.csv') },
  ];

  const isResponseSuccessful =
    httpResponse && statusCode >= RESPONSE_STATUS.OK && statusCode < RESPONSE_STATUS.BAD_REQUEST;
  const isRunning = isRunningTests || isAiTestsRunning || Boolean(aiRunStartedAt);

  return (
    <div className="relative flex flex-col gap-4 bg-surface py-3 px-4 border-b border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h5 className="m-0">{t('tests.testsTitle')}</h5>
          {!isResponseSuccessful && (
            <p className="m-0 text-xs text-muted-foreground">
              {t(httpResponse ? 'tests.testsUnavailable' : 'tests.testsHint')}
            </p>
          )}
        </div>
        {isRunningTests && (
          <LoaderWithText
            className="w-auto text-xs font-normal [&_.loader]:h-4 [&_.loader]:w-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
            text={t('tests.runningTests', { current: currentTest, total: testsCount })}
          />
        )}
      </div>
      <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-between gap-2">
        <div className="flex flex-col @xl:flex-row @xl:items-center gap-2 @xl:min-w-0">
          {!isRunningTests ? (
            <Button
              className="inline-flex items-center gap-2 @xl:truncate"
              disabled={isRunning || isSending || !isResponseSuccessful}
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
              <PlayIcon className="h-4 w-4 shrink-0" />
              <span className="@xl:truncate">{t('tests.generateAndRun')}</span>
            </Button>
          ) : (
            <Button className="inline-flex items-center gap-2 @xl:truncate" onClick={() => cancelAllTests(false)}>
              <StopIcon className="h-4 w-4 shrink-0" />
              <span className="@xl:truncate">{t('common.stop')}</span>
            </Button>
          )}
          {testResults && !isRunningTests && (
            <Button
              buttonType={ButtonType.SECONDARY_OUTLINE}
              className="@xl:truncate"
              disabled={isRunning}
              onClick={() => {
                dispatch(testsActions.addResultToCompare(testResults));
                if (testResultsToCompare.length < 1) dispatch(testsActions.setCompareResponse(httpResponse));
              }}
            >
              {testResultsToCompare.length < 1 ? t('tests.selectForCompare') : t('tests.compareWithSelected')}
            </Button>
          )}
        </div>
        {testResults && !isRunningTests && (
          <div className="flex flex-col @xl:flex-row @xl:justify-end @xl:items-center gap-4 @xl:gap-2 @xl:min-w-0">
            <div className="flex flex-col @xl:flex-row @xl:items-center gap-2">
              <Select
                isSearchable={false}
                options={exportFormatOptions}
                placeholder={t('tests.formatPlaceholder')}
                value={exportFormatOptions.find((option) => option.value === exportFormat)}
                onChange={(option) => option && dispatch(uiActions.setExportFormat(option.value))}
              />
              <Button buttonType={ButtonType.SECONDARY_OUTLINE} disabled={isRunning} onClick={exportReport}>
                {t('common.export')}
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
      {isRunningTests && testsCount > 0 && (
        <ProgressBar className="absolute bottom-0 left-0" max={testsCount} value={currentTest} />
      )}
    </div>
  );
}
