import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from 'src/components/buttons/Button';
import { Controls } from 'src/components/controls/Controls';
import Panel from 'src/components/panels/Panel';
import { validateSerialNumber } from 'src/features/settings/ai/AiLicenseSettings';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectRunningAiTests,
  selectSerialNumber,
  selectTestOptions,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { TestStatus } from 'src/types';
import { AiRequestMaskControls } from '../controls/AiRequestMaskControls';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function AiTestingPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { aiTests, isRunningTests, cancelAiTestsGeneration, executeAiTest } = useTests();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const runningAiTests = useAppSelector(selectRunningAiTests);
  const serialNumber = useAppSelector(selectSerialNumber);
  const testOptions = useAppSelector(selectTestOptions);

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
            ...getTestsTableColumns(['Parameter', 'Value', 'Expected', 'Actual'], t),
            {
              name: t('tables.result'),
              selector: (row) => row.status,
              width: '150px',
              cell: (row, id) => {
                if (row.actual) return row.status;

                return (
                  <Controls
                    isRunning={runningAiTests[id]}
                    executeTest={async () => await executeAiTest(id, testOptions)}
                  />
                );
              },
            },
          ]}
          expandableRows
          expandableRowsComponent={ExpandedTestComponent}
          expandableRowDisabled={(row) => row.status === TestStatus.Manual}
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
    </Panel>
  );
}
