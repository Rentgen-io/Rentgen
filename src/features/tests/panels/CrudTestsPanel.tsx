import { useTranslation } from 'react-i18next';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import useTests from 'src/hooks/useTests';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function CrudTestsPanel() {
  const { t } = useTranslation();
  const { crudTests, isSecurityRunning } = useTests();

  return (
    <>
      <TestsTableHeader tests={crudTests} />
      <TestsTable
        columns={getTestsTableColumns(['Method', 'Expected', 'Actual', 'Result'], t)}
        expandableRows
        expandableRowsComponent={ExpandedTestComponent}
        expandableRowDisabled={(row) => !row.request}
        expandOnRowClicked
        data={crudTests}
        progressComponent={<LoaderWithText text={t('tests.preparingCrud')} />}
        progressPending={isSecurityRunning}
        progressSkeleton={false}
        noDataComponent={
          <p className="p-4 m-0 text-center text-sm">
            {t('tests.crudDescription')}
            <br />
            <br />
            <strong>{t('tests.crudNote')}</strong> {t('tests.crudNoteText')}
          </p>
        }
      />
    </>
  );
}
