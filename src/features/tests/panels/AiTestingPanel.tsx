import { useTranslation } from 'react-i18next';
import Button from 'src/components/buttons/Button';
import Panel from 'src/components/panels/Panel';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectIsRunningTests } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { TestsTableHeader } from '../tables/TestsTable';

export default function AiTestingPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isRunningTests = useAppSelector(selectIsRunningTests);

  return (
    <Panel
      title={
        <TestsTableHeader
          tests={[]}
          title={t('tests.aiTesting')}
          onOpenSettings={() => dispatch(modalsActions.openSettingsModal(2))}
        />
      }
    >
      <div className="flex flex-col gap-4 p-4 text-center border-t border-border dark:border-dark-body">
        <h5 className="m-0">{t('tests.aiTestingTitle')}</h5>
        <p className="m-0 text-sm">{t('tests.aiTestingDescription')}</p>
        <Button className="w-fit self-center" disabled={isRunningTests || true} onClick={() => {}}>
          {t('tests.runAiTesting')}
        </Button>
      </div>
    </Panel>
  );
}
