import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCrudTests, selectIsSecurityRunning } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function CrudTestsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const crudTests = useAppSelector(selectCrudTests);
  const isSecurityRunning = useAppSelector(selectIsSecurityRunning);

  const columns = useMemo(() => getTestsTableColumns(['Method', 'Expected', 'Actual', 'Result'], t), [t]);

  return (
    <>
      <TestsTableHeader
        tests={crudTests}
        onOpenSettings={!crudTests?.length ? () => dispatch(modalsActions.openSettingsModal()) : undefined}
      />
      <TestsTable
        columns={columns}
        expandableRows
        expandableRowsComponent={ExpandedTestComponent}
        expandableRowDisabled={(row) => !row.request}
        expandOnRowClicked
        data={crudTests}
        progressComponent={<LoaderWithText className="justify-center" text={t('tests.preparingCrud')} />}
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
