import { memo, useMemo } from 'react';
import DataTable, { ExpanderComponentProps, TableColumn, TableProps, TableStyles } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { HttpResponse } from 'shared/types/http';
import { JsonDiffViewer } from 'src/components/viewers/JsonDiffViewer';

export interface PotentialBug {
  name: string;
  issue: string;
  originalResponse: HttpResponse | null;
  modifiedResponse: HttpResponse | null;
}

// Static: defined once instead of a new object on every render (the table would recompute its styles each time)
const TABLE_STYLES: TableStyles = {
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
};

/** The tests whose response changed between the two compared runs; a row expands to the response diff. */
export default function PotentialBugsTable({ data, ...otherProps }: Omit<TableProps<PotentialBug>, 'columns'>) {
  const { t } = useTranslation();

  const definedData = useMemo(() => data?.filter(Boolean) ?? [], [data]);

  const columns = useMemo<TableColumn<PotentialBug>[]>(
    () => [
      {
        name: t('tables.name'),
        selector: (row) => row.name,
      },
      {
        name: t('tables.description'),
        // `cell` for custom content (`selector` is for the plain value). The issues are one per line: kept, but long
        // ones wrap instead of overflowing the cell. `allowRowEvents`: clicking the text still expands the row
        cell: (row) => (
          <div className="py-1 px-0 whitespace-pre-wrap wrap-break-word" data-tag="allowRowEvents">
            {row.issue}
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      customStyles={TABLE_STYLES}
      expandableRows
      expandableRowsComponent={ExpandedPotentialBug}
      expandOnRowClicked
      data={definedData}
      fixedHeader={true}
      {...otherProps}
    />
  );
}

// The response diff (a Monaco diff editor); memoized, as rendering it is expensive
const ExpandedPotentialBug = memo(function ExpandedPotentialBug({ data }: ExpanderComponentProps<PotentialBug>) {
  return <JsonDiffViewer className="pt-3" data={[data.originalResponse, data.modifiedResponse]} />;
});
