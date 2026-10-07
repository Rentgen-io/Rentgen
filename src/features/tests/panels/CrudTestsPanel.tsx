import { useTranslation } from 'react-i18next';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import Panel from 'src/components/panels/Panel';
import { useAppSelector } from 'src/store/hooks';
import { selectCrudTests, selectIsSecurityRunning } from 'src/store/selectors';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function CrudTestsPanel() {
  const { t } = useTranslation();

  const crudTests = useAppSelector(selectCrudTests);
  const isSecurityRunning = useAppSelector(selectIsSecurityRunning);

  return (
    <Panel title={<TestsTableHeader tests={crudTests} title={t('tests.crud')} />}>
      <TestsTable
        columns={getTestsTableColumns(['Method', 'Expected', 'Actual', 'Result'], t)}
        expandableRows
        expandableRowsComponent={ExpandedTestComponent}
        expandOnRowClicked
        data={crudTests}
        progressComponent={<LoaderWithText text={t('tests.preparingCrud')} />}
        progressPending={isSecurityRunning}
        noDataComponent={
          <p className="p-4 m-0 text-center text-sm">
            {t('tests.crudDescription')}
            <br />
            <br />
            <strong>{t('tests.crudNote')}</strong> {t('tests.crudNoteText')}
          </p>
        }
      />
    </Panel>
  );
}
