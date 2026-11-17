import cn from 'classnames';
import { TFunction } from 'i18next';
import { CSSProperties, memo, useMemo } from 'react';
import DataTable, {
  ConditionalStyles,
  ExpanderComponentProps,
  TableColumn,
  TableProps,
} from 'react-data-table-component';
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

// Row background by test status (statuses without one keep the table's background)
const STATUS_BACKGROUNDS: Partial<Record<TestStatus, string>> = {
  [TestStatus.Pass]: 'var(--color-test-pass)',
  [TestStatus.Fail]: 'var(--color-test-fail)',
  [TestStatus.FailNoResponse]: 'var(--color-test-fail)',
  [TestStatus.Manual]: 'var(--color-test-manual)',
  [TestStatus.Warning]: 'var(--color-test-warning)',
  [TestStatus.Info]: 'var(--color-test-info)',
  [TestStatus.Bug]: 'var(--color-test-bug)',
};

/**
 * The tests table: rows colored by status, disabled (ignored) tests dimmed. Pass memoized `columns` (see the panels):
 * a new array on every render makes the table recompute all of them.
 */
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

  const definedData = useMemo(() => data?.filter((item) => item != null) ?? [], [data]);

  const conditionalRowStyles = useMemo<ConditionalStyles<TestResult>[]>(() => {
    const disabledTests = new Set([...disabledSecurityTests, ...disabledPerformanceInsights]);

    return [
      {
        when: () => true,
        style: (row): CSSProperties => ({
          color: 'var(--color-foreground)',
          ...(STATUS_BACKGROUNDS[row.status] && { backgroundColor: STATUS_BACKGROUNDS[row.status] }),
          ...(disabledTests.has(row.name) && { opacity: 0.5, cursor: 'not-allowed' }),
        }),
      },
    ];
  }, [disabledSecurityTests, disabledPerformanceInsights]);

  if (progressPending) return progressComponent;

  return (
    <DataTable
      className={twMerge(cn({ 'bg-background border border-border rounded!': definedData.length > 0 }), className)}
      columns={columns}
      conditionalRowStyles={conditionalRowStyles}
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
          <span className="py-1 px-2 text-xs text-metric-pass bg-metric-pass/10 rounded truncate">
            {passed} {t('common.passed')}
          </span>
        )}
        {warnings > 0 && (
          <span className="py-1 px-2 text-xs text-metric-warning bg-metric-warning/10 rounded truncate">
            {warnings} {warnings === 1 ? t('common.warning') : t('common.warnings')}
          </span>
        )}
        {failed > 0 && (
          <span className="py-1 px-2 text-xs text-metric-fail bg-metric-fail/10 rounded truncate">
            {failed} {t('common.failed')}
          </span>
        )}
        {bugs > 0 && (
          <span className="py-1 px-2 text-xs text-metric-bug bg-metric-bug/10 rounded truncate">
            {bugs} {bugs === 1 ? t('common.bug') : t('common.bugs')}
          </span>
        )}
        {info > 0 && (
          <span className="py-1 px-2 text-xs text-blue-500 bg-blue-500/10 rounded truncate">
            {info} {t('common.info')}
          </span>
        )}
        {manual > 0 && (
          <span className="py-1 px-2 text-xs text-gray-500 bg-gray-500/10 dark:text-gray-400 dark:bg-gray-500/20 rounded truncate">
            {manual} {t('common.manual')}
          </span>
        )}
        {ignored > 0 && (
          <span className="py-1 px-2 text-xs text-muted-foreground bg-muted-foreground/10 rounded truncate">
            {ignored} {t('common.ignored')}
          </span>
        )}
      </div>
      {onOpenSettings && (
        <IconButton aria-label={t('sidebar.settings')} title={t('sidebar.settings')} onClick={onOpenSettings}>
          <GearIcon className="size-4" />
        </IconButton>
      )}
    </div>
  );
}

// A test's request / response (with "Copy cURL"); memoized, as the HTTP panels are expensive to render
export const ExpandedTestComponent = memo(function ExpandedTestComponent({ data }: ExpanderComponentProps<TestResult>) {
  const { t } = useTranslation();
  const { request, response } = data;

  return (
    <div className="py-3 px-4 bg-background">
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

/**
 * The shared columns, the given ones visible. `selector` is each column's plain value, `cell` its custom content
 * (`data-tag="allowRowEvents"`: clicking the content still expands the row). Call it in a `useMemo`.
 */
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
    },
    {
      key: 'Value',
      name: label('Value'),
      selector: (row) => truncateValue(row.value),
      cell: (row) => (
        <span className="truncate" data-tag="allowRowEvents">
          {truncateValue(row.value)}
        </span>
      ),
    },
    {
      key: 'Check',
      name: label('Check'),
      selector: (row) => row.name,
    },
    {
      key: 'Method',
      name: label('Method'),
      selector: (row) => row.name,
    },
    {
      key: 'Expected',
      name: label('Expected'),
      selector: (row) => row.expected,
      cell: (row) => (
        <div className="py-1 px-0 whitespace-normal" data-tag="allowRowEvents">
          {row.expected}
        </div>
      ),
    },
    {
      key: 'Actual',
      name: label('Actual'),
      selector: (row) => row.actual,
      cell: (row) => (
        <div className="py-1 px-0 whitespace-normal" data-tag="allowRowEvents">
          {row.actual}
        </div>
      ),
    },
    {
      key: 'Result',
      name: label('Result'),
      selector: (row) => row.status,
      width: '150px',
    },
  ];

  return columns.map((column) => ({ ...column, omit: !visibleColumns.includes(column.key) }));
}
