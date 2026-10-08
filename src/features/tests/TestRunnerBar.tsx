import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useReportExport } from 'src/hooks/useReportExport';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectBodyParameters,
  selectCurrentTestResults,
  selectDisabledRunTests,
  selectDynamicVariables,
  selectExportFormat,
  selectHeaders,
  selectHttpResponse,
  selectIsRunningTests,
  selectMethod,
  selectQueryParameters,
  selectSelectedEnvironment,
  selectTestResultsToCompare,
  selectUrl,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { ReportFormat } from 'src/types';
import { substituteRequestVariables } from 'src/utils';

export default function TestRunnerBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const url = useAppSelector(selectUrl);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const method = useAppSelector(selectMethod);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const httpResponse = useAppSelector(selectHttpResponse);
  const testResults = useAppSelector(selectCurrentTestResults);
  const testResultsToCompare = useAppSelector(selectTestResultsToCompare);
  const isRunningTests = useAppSelector(selectIsRunningTests);
  const disabledRunTests = useAppSelector(selectDisabledRunTests);
  const exportFormat = useAppSelector(selectExportFormat);

  const { currentTest, testsCount, executeAllTests } = useTests();
  const { exportReport, generateCertificate } = useReportExport();

  const exportFormatOptions: SelectOption<ReportFormat>[] = [
    { value: 'json', label: t('exportFormats.json') },
    { value: 'md', label: t('exportFormats.markdown') },
    { value: 'csv', label: t('exportFormats.csv') },
  ];

  return (
    <>
      <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-between gap-4 @xl:gap-2">
        <div className="flex flex-col @xl:flex-row @xl:items-center gap-4 @xl:gap-2 @xl:min-w-0">
          <Button
            className="@xl:shrink-0 @xl:whitespace-nowrap"
            disabled={disabledRunTests}
            onClick={() =>
              executeAllTests({
                ...substituteRequestVariables(url, headers, body, selectedEnvironment, dynamicVariables),
                bodyParameters,
                method,
                queryParameters,
              })
            }
          >
            {isRunningTests
              ? t('tests.runningTests', { current: currentTest, total: testsCount })
              : t('tests.generateAndRun')}
          </Button>
          {testResults && (
            <Button
              className="@xl:truncate"
              buttonType={ButtonType.SECONDARY}
              disabled={isRunningTests}
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
          <div className="flex flex-col @xl:flex-row @xl:justify-end @xl:items-center gap-4 @xl:gap-2 @xl:min-w-0">
            <div className="flex flex-col @xl:flex-row @xl:items-center gap-2">
              <Select
                isSearchable={false}
                options={exportFormatOptions}
                placeholder={t('tests.formatPlaceholder')}
                value={exportFormatOptions.find((option) => option.value === exportFormat)}
                onChange={(option) => dispatch(uiActions.setExportFormat((option as SelectOption<ReportFormat>).value))}
              />
              <Button
                buttonType={ButtonType.SECONDARY}
                className="min-w-28"
                disabled={isRunningTests}
                onClick={exportReport}
              >
                {t('common.export')}
              </Button>
            </div>
            <Button className="@xl:truncate" disabled={isRunningTests} onClick={generateCertificate}>
              {t('tests.generateCertificate')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
