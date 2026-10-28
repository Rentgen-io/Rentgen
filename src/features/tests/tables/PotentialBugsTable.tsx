import { memo, useMemo } from 'react';
import DataTable, { ExpanderComponentProps, TableProps } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { JsonDiffViewer } from 'src/components/viewers/JsonDiffViewer';
import { useAppSelector } from 'src/store/hooks';
import { selectTheme } from 'src/store/selectors';
import { HttpResponse } from 'src/types';

export interface PotentialBug {
  name: string;
  issue: string;
  originalResponse: HttpResponse | null;
  modifiedResponse: HttpResponse | null;
}

export default function PotentialBugsTable({ data, ...otherProps }: Omit<TableProps<PotentialBug>, 'columns'>) {
  const { t } = useTranslation();

  const theme = useAppSelector(selectTheme);

  const definedData = useMemo(() => data?.filter(Boolean) ?? [], [data]);
  const isDark = theme === 'dark';

  return (
    <DataTable
      columns={[
        {
          name: t('tables.name'),
          selector: (row) => row.name,
        },
        {
          name: t('tables.description'),
          selector: (row, id) => (
            <div className="py-1 px-0 whitespace-pre" data-column-id={id} data-tag="allowRowEvents">
              {row.issue}
            </div>
          ),
        },
      ]}
      customStyles={{
        expanderCell: {
          style: {
            ...(isDark && {
              borderBottomColor: '#343a46',
            }),
          },
        },
        expanderButton: {
          style: {
            ...(isDark && { color: 'white' }),
          },
        },
        headRow: {
          style: {
            color: isDark ? 'white' : 'black',
            backgroundColor: isDark ? '#23272f' : '#fafafa',
            ...(isDark && {
              borderBottomColor: '#343a46',
            }),
          },
        },
        rows: {
          style: {
            color: isDark ? 'white' : 'black',
            backgroundColor: 'transparent',
          },
        },
        cells: {
          style: {
            ...(isDark && {
              borderBottomColor: '#343a46',
            }),
          },
        },
        table: {
          style: {
            backgroundColor: 'transparent',
          },
        },
      }}
      expandableRows
      expandableRowsComponent={ExpandedTestComponent}
      expandOnRowClicked
      data={definedData}
      fixedHeader={true}
      {...otherProps}
    />
  );
}

export const ExpandedTestComponent = memo(({ data }: ExpanderComponentProps<PotentialBug>) => (
  <JsonDiffViewer className="py-4" data={[data.originalResponse, data.modifiedResponse]} />
));
