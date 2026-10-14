import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from 'src/components/buttons/Button';
import Panel from 'src/components/panels/Panel';
import { validateSerialNumber } from 'src/features/settings/ai/AiLicenseSettings';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectActiveAiProvider, selectAiTests, selectIsRunningTests, selectSerialNumber } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { AiRequestMaskControls } from '../controls/AiRequestMaskControls';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function AiTestingPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const aiTests = useAppSelector(selectAiTests);
  const isRunningTests = useAppSelector(selectIsRunningTests);
  const serialNumber = useAppSelector(selectSerialNumber);
  const activeAiProvider = useAppSelector(selectActiveAiProvider);

  const [showAiRequestMaskControls, setShowAiRequestMaskControls] = useState<boolean>(false);

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
          columns={[...getTestsTableColumns(['Parameter', 'Value', 'Expected', 'Actual', 'Result'], t)]}
          expandableRows
          expandableRowsComponent={ExpandedTestComponent}
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
