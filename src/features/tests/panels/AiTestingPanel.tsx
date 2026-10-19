import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Button from 'src/components/buttons/Button';
import { Controls } from 'src/components/controls/Controls';
import SimpleSelect from 'src/components/inputs/SimpleSelect';
import Panel from 'src/components/panels/Panel';
import { validateSerialNumber } from 'src/features/settings/ai/AiLicenseSettings';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectRunningAiTests,
  selectSelectedRequestId,
  selectSerialNumber,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  determineRequestParameterTestStatus,
  determineTestStatus,
  ERROR_RESPONSE_EXPECTED,
  SUCCESS_RESPONSE_EXPECTED,
} from 'src/test-engine';
import { AiRequestMaskControls } from '../controls/AiRequestMaskControls';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function AiTestingPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { aiTests, aiUsage, isRunningTests, cancelAiTestsGeneration, executeAiTest } = useTests();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const runningAiTests = useAppSelector(selectRunningAiTests);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const serialNumber = useAppSelector(selectSerialNumber);

  const [showAiRequestMaskControls, setShowAiRequestMaskControls] = useState<boolean>(false);

  useEffect(() => cancelAiTestsGeneration, [cancelAiTestsGeneration]);

  return (
    <Panel
      title={
        <TestsTableHeader
          tests={aiTests ?? []}
          title={t('tests.aiTesting')}
          onOpenSettings={() => dispatch(modalsActions.openSettingsModal(2))}
        />
      }
    >
      {aiTests && aiTests.length > 0 ? (
        <TestsTable
          columns={[
            {
              name: t('tables.check'),
              selector: (row, id) => (
                <div className="py-1 px-0 line-clamp-4 whitespace-normal" data-column-id={id} data-tag="allowRowEvents">
                  {row.name}
                </div>
              ),
            },
            {
              name: t('tables.expected'),
              selector: (row) => row.expected,
              cell: (row, id) =>
                !row.response ? (
                  row.expected
                ) : (
                  <SimpleSelect
                    className="pl-0 text-[13px] bg-transparent border-none"
                    options={[
                      { value: SUCCESS_RESPONSE_EXPECTED, label: SUCCESS_RESPONSE_EXPECTED },
                      { value: ERROR_RESPONSE_EXPECTED, label: ERROR_RESPONSE_EXPECTED },
                    ]}
                    value={row.expected}
                    onChange={(event) => {
                      const expected = event.target.value as string;

                      if (!row.response) return;

                      const { actual, status } = determineTestStatus(row.response, (response, statusCode) =>
                        determineRequestParameterTestStatus(response, statusCode, {
                          valid: expected === SUCCESS_RESPONSE_EXPECTED,
                          value: row.value,
                        }),
                      );
                      const testResult = { ...row, actual, expected, status };

                      dispatch(testsActions.updateAiTest({ id, result: testResult }));

                      if (selectedRequestId)
                        dispatch(
                          testsActions.updateAiTestResults({
                            requestId: selectedRequestId,
                            id,
                            result: testResult,
                          }),
                        );
                    }}
                  />
                ),
            },
            ...getTestsTableColumns(['Actual'], t),
            {
              name: t('tables.result'),
              selector: (row) => row.status,
              width: '150px',
              cell: (row, id) => {
                if (row.actual) return row.status;

                return <Controls isRunning={runningAiTests[id]} executeTest={async () => await executeAiTest(id)} />;
              },
            },
          ]}
          expandableRows
          expandableRowsComponent={ExpandedTestComponent}
          expandableRowDisabled={(row) => !row.request}
          expandOnRowClicked
          data={aiTests}
        />
      ) : (
        <div className="flex flex-col gap-4 p-4 text-center border-t border-border dark:border-dark-body">
          {!showAiRequestMaskControls ? (
            <>
              <h5 className="m-0">{t('tests.aiTestingTitle')}</h5>
              <p className="m-0 text-sm">{t('tests.aiTestingDescription')}</p>
              <Button
                className="@xl:self-center"
                disabled={isRunningTests}
                onClick={() => {
                  if (!validateSerialNumber(serialNumber) || !activeAiProvider) {
                    dispatch(modalsActions.openSettingsModal(2));
                    return;
                  }

                  setShowAiRequestMaskControls(true);
                }}
              >
                {t('tests.runAiTesting')}
              </Button>
            </>
          ) : (
            <AiRequestMaskControls onCancel={() => setShowAiRequestMaskControls(false)} />
          )}
        </div>
      )}
      {aiUsage && (
        <div className="p-4 text-xs text-text-secondary @xl:text-right">
          <Trans
            i18nKey="ai.usage"
            components={{
              total: <strong className="text-text dark:text-dark-text">{aiUsage.totalTokens}</strong>,
              prompt: <strong className="text-text dark:text-dark-text">{aiUsage.promptTokens}</strong>,
              completion: <strong className="text-text dark:text-dark-text">{aiUsage.completionTokens}</strong>,
            }}
          />
        </div>
      )}
    </Panel>
  );
}
