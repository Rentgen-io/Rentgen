import { memo, useMemo } from 'react';
import DataTable, { ExpanderComponentProps, TableProps } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { JsonDiffViewer } from 'src/components/viewers/JsonDiffViewer';
import { HttpResponse } from 'src/types';

export interface PotentialBug {
  name: string;
  issue: string;
  originalResponse: HttpResponse | null;
  modifiedResponse: HttpResponse | null;
}

export default function PotentialBugsTable({ data, ...otherProps }: Omit<TableProps<PotentialBug>, 'columns'>) {
  const { t } = useTranslation();

  const definedData = useMemo(() => data?.filter(Boolean) ?? [], [data]);

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
            borderBottomColor: 'var(--color-border)',
          },
        },
        expanderButton: {
          style: {
            color: 'var(--color-foreground)',
          },
        },
        headRow: {
          style: {
            color: 'var(--color-foreground)',
            backgroundColor: 'var(--color-surface)',
            borderBottomColor: 'var(--color-border)',
          },
        },
        rows: {
          style: {
            color: 'var(--color-foreground)',
            backgroundColor: 'transparent',
          },
        },
        cells: {
          style: {
            borderBottomColor: 'var(--color-border)',
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
  <JsonDiffViewer className="pt-3" data={[data.originalResponse, data.modifiedResponse]} />
));
