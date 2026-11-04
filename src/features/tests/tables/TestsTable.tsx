import cn from 'classnames';
import { TFunction } from 'i18next';
import { memo, useMemo } from 'react';
import DataTable, { ExpanderComponentProps, TableColumn, TableProps } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { CopyButton } from 'src/components/buttons/CopyButton';
import { IconButton } from 'src/components/buttons/IconButton';
import { HttpPanel } from 'src/components/panels/HttpPanel';
import { useAppSelector } from 'src/store/hooks';
import { selectDisabledPerformanceInsights, selectDisabledSecurityTests } from 'src/store/selectors';
import { getTestsStatistics } from 'src/test-engine';
import { TestResult, TestStatus } from 'src/types';
import { generateCurl, truncateValue } from 'src/utils';
import { twMerge } from 'tailwind-merge';

import GearIcon from 'src/assets/icons/gear-icon.svg';

export default function TestsTable({
  columns,
  data,
  className,
  noDataComponent,
  progressPending,
  progressComponent,
  ...otherProps
}: TableProps<TestResult>) {
  const { t } = useTranslation();

  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);

  const definedData = data?.filter((item) => item != null) ?? [];
  const disabledTests = [...disabledSecurityTests, ...disabledPerformanceInsights];

  if (progressPending) return progressComponent;

  return (
    <DataTable
      className={twMerge(cn({ 'bg-background border border-border rounded!': definedData.length > 0 }), className)}
      columns={columns}
      conditionalRowStyles={[
        {
          when: () => true,
          style: (row) => {
            const styles = {
              color: 'var(--color-foreground)',
              ...(disabledTests.includes(row.name) ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            };

            switch (row.status) {
              case TestStatus.Pass:
                return { ...styles, backgroundColor: 'var(--color-test-pass)' };
              case TestStatus.Fail:
              case TestStatus.FailNoResponse:
                return { ...styles, backgroundColor: 'var(--color-test-fail)' };
              case TestStatus.Manual:
                return { ...styles, backgroundColor: 'var(--color-test-manual)' };
              case TestStatus.Warning:
                return { ...styles, backgroundColor: 'var(--color-test-warning)' };
              case TestStatus.Info:
                return { ...styles, backgroundColor: 'var(--color-test-info)' };
              case TestStatus.Bug:
                return { ...styles, backgroundColor: 'var(--color-test-bug)' };
              default:
                return styles;
            }
          },
        },
      ]}
      data={definedData}
      noDataComponent={
        noDataComponent ? noDataComponent : <p className="p-4 m-0 text-center text-sm">{t('tests.noTestsGenerated')}</p>
      }
      progressComponent={progressComponent}
      progressPending={progressPending}
      {...otherProps}
    />
  );
}

export function TestsTableHeader({
  disabledTests,
  tests,
  onOpenSettings,
}: {
  disabledTests?: string[];
  tests: TestResult[];
  onOpenSettings?(): void;
}) {
  const { t } = useTranslation();
  const { bugs, failed, ignored, info, manual, passed, warnings } = useMemo(
    () => getTestsStatistics(tests, disabledTests),
    [tests, disabledTests],
  );

  return (
    <div className="min-h-8.5 flex items-center gap-2">
      <div className="flex-auto flex items-center gap-2 lowercase">
        {passed > 0 && (
          <span className="py-1 px-2 text-xs text-green-500 bg-green-500/10 rounded">
            {passed} {t('common.passed')}
          </span>
        )}
        {warnings > 0 && (
          <span className="py-1 px-2 text-xs text-yellow-500 bg-yellow-500/10 rounded">
            {warnings} {warnings === 1 ? t('common.warning') : t('common.warnings')}
          </span>
        )}
        {failed > 0 && (
          <span className="py-1 px-2 text-xs text-red-500 bg-red-500/10 rounded">
            {failed} {t('common.failed')}
          </span>
        )}
        {bugs > 0 && (
          <span className="py-1 px-2 text-xs text-purple-500 bg-purple-500/10 rounded">
            {bugs} {bugs === 1 ? t('common.bug') : t('common.bugs')}
          </span>
        )}
        {info > 0 && (
          <span className="py-1 px-2 text-xs text-blue-500 bg-blue-500/10 rounded">
            {info} {t('common.info')}
          </span>
        )}
        {manual > 0 && (
          <span className="py-1 px-2 text-xs text-gray-500 bg-gray-500/10 dark:text-gray-400 dark:bg-gray-500/20 rounded">
            {manual} {t('common.manual')}
          </span>
        )}
        {ignored > 0 && (
          <span className="py-1 px-2 text-xs text-muted-foreground bg-muted-foreground/10 rounded">
            {ignored} {t('common.ignored')}
          </span>
        )}
      </div>
      {onOpenSettings && (
        <IconButton onClick={onOpenSettings}>
          <GearIcon className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
}

export const ExpandedTestComponent = memo(({ data }: ExpanderComponentProps<TestResult>) => {
  const { t } = useTranslation();
  const { request, response } = data;

  return (
    <div className="p-4 bg-background">
      {request && (
        <CopyButton className="mb-4" textToCopy={generateCurl(request)}>
          {t('curl.copyCurl')}
        </CopyButton>
      )}
      <div className="grid grid-cols-2 gap-4 items-stretch">
        <HttpPanel title={t('tables.request')} source={request} />
        <HttpPanel title={t('response.title')} source={response} />
      </div>
    </div>
  );
});

type TestsTableColumn = 'Parameter' | 'Value' | 'Check' | 'Method' | 'Expected' | 'Actual' | 'Result';

const columnTranslationKeys: Record<TestsTableColumn, string> = {
  Parameter: 'tables.parameter',
  Value: 'tables.value',
  Check: 'tables.check',
  Method: 'tables.method',
  Expected: 'tables.expected',
  Actual: 'tables.actual',
  Result: 'tables.result',
};

export function getTestsTableColumns(
  visibleColumns: TestsTableColumn[] = [],
  t?: TFunction,
): TableColumn<TestResult>[] {
  const label = (key: TestsTableColumn) => (t ? t(columnTranslationKeys[key]) : key);

  const columns: (TableColumn<TestResult> & { key: TestsTableColumn })[] = [
    {
      key: 'Parameter',
      name: label('Parameter'),
      selector: (row) => row.name,
      omit: true,
    },
    {
      key: 'Value',
      name: label('Value'),
      selector: (row, id) => (
        <span className="whitespace-pre" data-column-id={id} data-tag="allowRowEvents">
          {truncateValue(row.value)}
        </span>
      ),
      omit: true,
    },
    {
      key: 'Check',
      name: label('Check'),
      selector: (row) => row.name,
      omit: true,
    },
    {
      key: 'Method',
      name: label('Method'),
      selector: (row) => row.name,
      omit: true,
    },
    {
      key: 'Expected',
      name: label('Expected'),
      selector: (row, id) => (
        <div className="py-1 px-0 whitespace-normal" data-column-id={id} data-tag="allowRowEvents">
          {row.expected}
        </div>
      ),
      omit: true,
    },
    {
      key: 'Actual',
      name: label('Actual'),
      selector: (row, id) => (
        <div className="py-1 px-0 whitespace-normal" data-column-id={id} data-tag="allowRowEvents">
          {row.actual}
        </div>
      ),
      omit: true,
    },
    {
      key: 'Result',
      name: label('Result'),
      selector: (row) => row.status,
      width: '150px',
      omit: true,
    },
  ];

  return columns.map((column) => ({ ...column, omit: !visibleColumns.includes(column.key) }));
}
