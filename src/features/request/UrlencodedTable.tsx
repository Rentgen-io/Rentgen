import { useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectBodyUrlencoded, selectHighlightColor, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { PostmanUrlencodedItem } from 'src/types';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

// A urlencoded field; `id` only identifies the row while editing (stable table / React key), it isn't saved
interface Row extends PostmanUrlencodedItem {
  id: string;
}

/**
 * Edits the urlencoded body fields of the request. Every change is written to the store (so a send always uses the
 * current fields) and the request is autosaved on blur, as the other request editors do.
 */
export default function UrlencodedTable() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const highlightColor = useAppSelector(selectHighlightColor);
  const items = useAppSelector(selectBodyUrlencoded);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  const [rows, setRows] = useState<Row[]>(() => toRows(items));
  const [syncedItems, setSyncedItems] = useState<PostmanUrlencodedItem[] | undefined>(items);

  // Fields changed elsewhere (another request selected, an import): the rows start over from them
  if (!isSameItems(items, syncedItems)) {
    setSyncedItems(items);
    setRows(toRows(items));
  }

  const updateRows = (nextRows: Row[]) => {
    const rowsWithEmptyRow = withTrailingEmptyRow(nextRows);
    const nextItems = rowsWithEmptyRow.filter((row) => !isEmptyRow(row)).map(toItem);

    setRows(rowsWithEmptyRow);
    setSyncedItems(nextItems);
    dispatch(requestActions.setBodyUrlencoded(nextItems));
  };

  const changeRow = (id: string, field: 'key' | 'value', newValue: string) =>
    updateRows(
      rows
        .map((row) => (row.id === id ? { ...row, [field]: newValue } : row))
        .filter((row) => row.id === id || !isEmptyRow(row)),
    );

  const removeRow = (id: string) => {
    updateRows(rows.filter((row) => row.id !== id));
    autoSaveRequest();
  };

  const columns: TableColumn<Row>[] = [
    {
      name: t('request.key'),
      cell: (row) => (
        <HighlightedInput
          className="w-full bg-transparent border-0"
          highlightColor={highlightColor}
          placeholder={t('request.key')}
          title={row.key}
          value={row.key}
          variables={variables}
          onBlur={autoSaveRequest}
          onChange={(event) => changeRow(row.id, 'key', event.target.value)}
        />
      ),
    },
    {
      name: t('request.value'),
      cell: (row) => (
        <HighlightedInput
          className="w-full bg-transparent border-0"
          highlightColor={highlightColor}
          placeholder={t('request.value')}
          title={row.value}
          value={row.value}
          variables={variables}
          onBlur={autoSaveRequest}
          onChange={(event) => changeRow(row.id, 'value', event.target.value)}
        />
      ),
    },
    {
      cell: (row) =>
        isEmptyRow(row) ? null : (
          <TrashIcon
            className="size-3 text-muted-foreground hover:text-red-600 cursor-pointer"
            onClick={() => removeRow(row.id)}
          />
        ),
      width: '40px',
      center: true,
    },
  ];

  return <DataTable className="urlencoded-data-table" columns={columns} data={rows} keyField="id" />;
}

// Row ids only need to be unique while the app runs
let nextRowId = 0;

function createRow(item: PostmanUrlencodedItem = { key: '', value: '' }): Row {
  return { ...item, value: item.value ?? '', id: `urlencoded-${nextRowId++}` };
}

function toRows(items: PostmanUrlencodedItem[] | undefined): Row[] {
  return withTrailingEmptyRow((items ?? []).map((item) => createRow(item)));
}

function toItem(row: Row): PostmanUrlencodedItem {
  const item: PostmanUrlencodedItem = { key: row.key, value: row.value };
  if (row.disabled !== undefined) item.disabled = row.disabled;
  if (row.description !== undefined) item.description = row.description;

  return item;
}

function isEmptyRow({ key, value }: PostmanUrlencodedItem): boolean {
  return key.trim() === '' && (value ?? '').trim() === '';
}

/** Keeps exactly one empty row at the end, for adding a field. */
function withTrailingEmptyRow(rows: Row[]): Row[] {
  const lastRow = rows[rows.length - 1];
  return lastRow && isEmptyRow(lastRow) ? rows : [...rows, createRow()];
}

function isSameItems(a: PostmanUrlencodedItem[] | undefined, b: PostmanUrlencodedItem[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  return a.every(
    (item, index) =>
      item.key === b[index].key &&
      item.value === b[index].value &&
      item.disabled === b[index].disabled &&
      item.description === b[index].description,
  );
}
