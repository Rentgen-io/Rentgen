import { useState } from 'react';

/** An item of a request editor table: a header, or a urlencoded or form-data field. */
interface EditableItem {
  key: string;
  value?: string;
}

// A row of an editor table; `id` only identifies the row while editing (stable table / React key), it isn't saved
export type EditableRow<TItem extends EditableItem> = TItem & { id: string; value: string };

interface Options<TItem extends EditableItem> {
  /** The saved items (from the store). */
  items: TItem[] | undefined;
  /** Whether nothing is entered in the item; an empty row isn't saved. */
  isEmpty: (item: TItem) => boolean;
  /** Whether two item lists are the same. */
  isSame: (a: TItem[], b: TItem[]) => boolean;
  /** The item to save for a row. */
  toItem: (row: EditableRow<TItem>) => TItem;
  /** Saves the items; called on every change. */
  onChange: (items: TItem[]) => void;
}

// Row ids only need to be unique while the app runs
let nextRowId = 0;

/**
 * The rows of a request editor table: the saved items, plus exactly one empty row at the end for adding an item.
 * Every change saves the non-empty rows; a row that is emptied is removed, unless it's the one being edited.
 * When the items change elsewhere (another request selected, an import), the rows start over from them.
 */
export function useEditableRows<TItem extends EditableItem>({
  items,
  isEmpty,
  isSame,
  toItem,
  onChange,
}: Options<TItem>) {
  const savedItems = items ?? [];

  const createRow = (item = { key: '', value: '' } as TItem): EditableRow<TItem> => ({
    ...item,
    value: item.value ?? '',
    id: `row-${nextRowId++}`,
  });

  const withTrailingEmptyRow = (rows: EditableRow<TItem>[]): EditableRow<TItem>[] => {
    const lastRow = rows[rows.length - 1];
    return lastRow && isEmpty(lastRow) ? rows : [...rows, createRow()];
  };

  const toRows = (items: TItem[]) => withTrailingEmptyRow(items.map((item) => createRow(item)));

  const [rows, setRows] = useState(() => toRows(savedItems));
  const [syncedItems, setSyncedItems] = useState(savedItems);

  if (!isSame(savedItems, syncedItems)) {
    setSyncedItems(savedItems);
    setRows(toRows(savedItems));
  }

  const updateRows = (nextRows: EditableRow<TItem>[]) => {
    const rowsWithEmptyRow = withTrailingEmptyRow(nextRows);
    const nextItems = rowsWithEmptyRow.filter((row) => !isEmpty(row)).map(toItem);

    setRows(rowsWithEmptyRow);
    setSyncedItems(nextItems);
    onChange(nextItems);
  };

  const changeRow = (id: string, changes: Partial<TItem>) =>
    updateRows(
      rows.map((row) => (row.id === id ? { ...row, ...changes } : row)).filter((row) => row.id === id || !isEmpty(row)),
    );

  const removeRow = (id: string) => updateRows(rows.filter((row) => row.id !== id));

  return { rows, changeRow, removeRow };
}
