import cn from 'classnames';
import { TFunction } from 'i18next';
import { memo } from 'react';
import DataTable, { ExpanderComponentProps, TableColumn, TableProps } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/hooks';
import { selectDisabledPerformanceInsights, selectDisabledSecurityTests } from '../../store/selectors';
import { TestResult, TestStatus } from '../../types';
import {
  decodeProtobufResponse,
  extractBodyFromResponse,
  generateCurl,
  isUrlEncodedContentType,
  truncateValue,
} from '../../utils';
import { CopyButton } from '../buttons/CopyButton';
import { HttpPanel } from '../panels/HttpPanel';

export default function TestsTable({ columns, data, className, ...otherProps }: TableProps<TestResult>) {
  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const definedData = data?.filter((item) => item != null) ?? [];
  const disabledTests = [...disabledSecurityTests, ...disabledPerformanceInsights];

  return (
    <DataTable
      className={cn('border-t border-border dark:border-t-0 rounded-t-none!', className)}
      columns={columns}
      conditionalRowStyles={[
        {
          when: () => true,
          style: (row) => {
            const styles = disabledTests.includes(row.name)
              ? { opacity: 0.5, cursor: 'not-allowed', '> *': { 'pointer-events': 'none' } }
              : {};

            switch (row.status) {
              case TestStatus.Pass:
                return { ...styles, backgroundColor: '#d4edda' };
              case TestStatus.Fail:
              case TestStatus.FailNoResponse:
                return { ...styles, backgroundColor: '#f8d7da' };
              case TestStatus.Manual:
                return { ...styles, backgroundColor: '#e2e3e5' };
              case TestStatus.Warning:
                return { ...styles, backgroundColor: '#fff3cd' };
              case TestStatus.Info:
                return { ...styles, backgroundColor: '#e6f0ff' };
              case TestStatus.Bug:
                return { ...styles, backgroundColor: '#f3e8ff' };
              default:
                return styles;
            }
          },
        },
      ]}
      customStyles={{
        expanderCell: {
          style: { minWidth: '28px', width: '28px', flex: '0 0 28px' },
        },
        expanderButton: {
          style: {
            '&:hover': { backgroundColor: 'transparent !important' },
            '&:focus': { backgroundColor: 'transparent !important' },
            '&:disabled': { display: 'none' },
          },
        },
      }}
      data={definedData}
      {...otherProps}
    />
  );
}

export const ExpandedTestComponent = memo(
  ({
    data,
    headers,
    messageType,
    protoFile,
  }: ExpanderComponentProps<TestResult> & {
    headers: Record<string, string>;
    messageType: string;
    protoFile: File | null;
  }) => {
    const { t } = useTranslation();
    const { request, response } = data;
    const decoded =
      headers && isUrlEncodedContentType(headers) && protoFile && messageType
        ? decodeProtobufResponse(messageType, response)
        : null;
    const modifiedResponse = response ? { ...response } : null;

    if (modifiedResponse && modifiedResponse.body)
      modifiedResponse.body = extractBodyFromResponse(modifiedResponse) as any;

    return (
      <div className="p-4 bg-body dark:bg-dark-body">
        {request && (
          <CopyButton className="mb-4" textToCopy={generateCurl(request)}>
            {t('curl.copyCurl')}
          </CopyButton>
        )}
        <div className="grid grid-cols-2 gap-4 items-stretch">
          <HttpPanel title={t('tables.request')} source={request} />
          <HttpPanel title={t('response.title')} source={modifiedResponse}>
            {decoded && <HttpPanel title={t('protobuf.decodedProtobuf')} source={decoded} />}
          </HttpPanel>
        </div>
      </div>
    );
  },
);

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
      selector: (row) => truncateValue(row.value),
      omit: true,
      style: {
        'div:first-child': {
          whiteSpace: 'pre !important',
        },
      },
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
      selector: (row) => row.expected,
      omit: true,
      style: {
        'div:first-child': {
          padding: '0.25rem 0',
          whiteSpace: 'normal !important',
        },
      },
    },
    {
      key: 'Actual',
      name: label('Actual'),
      selector: (row) => row.actual,
      omit: true,
      style: {
        'div:first-child': {
          padding: '0.5rem 0',
          whiteSpace: 'normal !important',
        },
      },
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
