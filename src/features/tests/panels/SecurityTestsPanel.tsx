import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { LARGE_PAYLOAD_TEST_NAME } from 'shared/testNames';
import Toggle from 'src/components/inputs/Toggle';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import { SECURITY_TESTS } from 'src/features/settings/test-engine/SecurityTestsSettings';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDisabledSecurityTests } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { TestStatus } from 'src/types';
import LargePayloadTestRunControls from '../controls/LargePayloadTestRunControls';
import TestResultControls from '../controls/TestResultControls';
import TestsTable, { ExpandedTestComponent, TestsTableHeader, getTestsTableColumns } from '../tables/TestsTable';

export default function SecurityTestsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { isSecurityRunning, securityTests } = useTests();

  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);

  const hasFailures = securityTests.some(({ status }) =>
    [TestStatus.Bug, TestStatus.Fail, TestStatus.Warning].includes(status),
  );

  return (
    <>
      <TestsTableHeader
        disabledTests={disabledSecurityTests}
        tests={securityTests}
        onOpenSettings={() => dispatch(modalsActions.openSettingsModal())}
      />
      <div className="flex flex-col flex-auto min-h-146.75! gap-4 [&>div]:flex [&>div]:flex-col [&>div]:flex-auto [&>div]:h-0">
        <TestsTable
          columns={[
            ...getTestsTableColumns(['Check', 'Expected', 'Actual'], t),
            {
              name: t('tables.result'),
              selector: (row) => row.status,
              width: hasFailures ? '270px' : '150px',
              cell: (row, id) => (
                <TestResultControls
                  className={cn('py-1', { 'items-end': row.name === LARGE_PAYLOAD_TEST_NAME })}
                  data-column-id={id}
                  data-tag="allowRowEvents"
                  testResult={row}
                  testType="security"
                >
                  {row.name === LARGE_PAYLOAD_TEST_NAME ? (
                    <LargePayloadTestRunControls />
                  ) : (
                    <p className="m-0 mr-2 whitespace-nowrap" data-column-id={id} data-tag="allowRowEvents">
                      {row.status}
                    </p>
                  )}
                </TestResultControls>
              ),
            },
            {
              name: t('common.ignore'),
              width: '80px',
              cell: (row, id) => (
                <div data-column-id={id} data-tag="allowRowEvents">
                  {SECURITY_TESTS.includes(row.name) && (
                    <Toggle
                      key={id}
                      checked={!disabledSecurityTests.includes(row.name)}
                      onChange={() => dispatch(settingsActions.toggleSecurityTest(row.name))}
                    />
                  )}
                </div>
              ),
            },
          ]}
          expandableRows
          expandableRowsComponent={ExpandedTestComponent}
          expandableRowDisabled={(row) => disabledSecurityTests.includes(row.name) || !row.request}
          expandOnRowClicked
          data={securityTests}
          fixedHeader={true}
          progressComponent={
            <LoaderWithText className="flex-auto justify-center" text={t('tests.runningSecurityTests')} />
          }
          progressPending={isSecurityRunning}
          progressSkeleton={false}
        />
      </div>
    </>
  );
}
