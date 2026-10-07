import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME,
  LOAD_TEST_NAME,
  RESPONSE_SIZE_CHECK_TEST_NAME,
} from 'shared/testNames';
import Toggle from 'src/components/inputs/Toggle';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import Panel from 'src/components/panels/Panel';
import { PERFORMANCE_INSIGHTS } from 'src/features/settings/test-engine/PerformanceInsightsSettings';
import { LoadTestControls } from 'src/features/tests/controls/LoadTestControls';
import { TestResultControls } from 'src/features/tests/controls/TestResultControls';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBodyParameters,
  selectCurrentTestResults,
  selectDisabledPerformanceInsights,
  selectIsLoadTestRunning,
  selectIsPerformanceRunning,
  selectPerformanceTests,
  selectQueryParameters,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { TestStatus } from 'src/types';
import TestsTable, { ExpandedTestComponent, TestsTableHeader, getTestsTableColumns } from '../tables/TestsTable';

export default function PerformanceInsightsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const performanceTests = useAppSelector(selectPerformanceTests);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const isPerformanceRunning = useAppSelector(selectIsPerformanceRunning);
  const isLoadTestRunning = useAppSelector(selectIsLoadTestRunning);
  const testResults = useAppSelector(selectCurrentTestResults);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);

  const { executeLoadTest } = useTests();

  const hasFailures = performanceTests.some(({ status }) =>
    [TestStatus.Bug, TestStatus.Fail, TestStatus.Warning].includes(status),
  );

  return (
    <Panel
      title={
        <TestsTableHeader
          disabledTests={disabledPerformanceInsights}
          tests={performanceTests}
          title={t('tests.performanceInsights')}
          onOpenSettings={() => dispatch(modalsActions.openSettingsModal())}
        />
      }
    >
      <TestsTable
        columns={[
          ...getTestsTableColumns(['Check', 'Expected'], t),
          {
            name: t('tables.actual'),
            selector: (row) => row.actual,
            cell: (row) => <div className="py-1">{row.actual}</div>,
          },
          {
            name: t('tables.result'),
            selector: (row) => row.status,
            width: hasFailures ? '325px' : '220px',
            cell: (row) => (
              <TestResultControls
                className={cn('py-1', { 'items-end': row.name === LOAD_TEST_NAME })}
                testResult={row}
                testType="performance"
              >
                {row.name === LOAD_TEST_NAME && testResults ? (
                  <LoadTestControls
                    isRunning={isLoadTestRunning}
                    executeTest={(threadCount: number, requestCount: number) =>
                      executeLoadTest(
                        { ...testResults.testOptions, bodyParameters, queryParameters },
                        threadCount,
                        requestCount,
                      )
                    }
                  />
                ) : (
                  <p className="m-0 mr-2 whitespace-nowrap">{row.status}</p>
                )}
              </TestResultControls>
            ),
          },
          {
            name: t('common.ignore'),
            width: '80px',
            cell: (row, id) => (
              <div data-column-id={id} data-tag="allowRowEvents">
                {PERFORMANCE_INSIGHTS.includes(row.name) && (
                  <Toggle
                    key={id}
                    checked={!disabledPerformanceInsights.includes(row.name)}
                    onChange={() => dispatch(settingsActions.togglePerformanceInsight(row.name))}
                  />
                )}
              </div>
            ),
          },
        ]}
        expandableRows
        expandableRowsComponent={ExpandedTestComponent}
        expandableRowDisabled={(row) =>
          (row.name !== RESPONSE_SIZE_CHECK_TEST_NAME && row.name !== ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME) ||
          !row.response ||
          disabledPerformanceInsights.includes(row.name)
        }
        expandOnRowClicked
        data={performanceTests}
        progressComponent={<LoaderWithText text={t('tests.runningPerformanceInsights')} />}
        progressPending={isPerformanceRunning}
      />
    </Panel>
  );
}
