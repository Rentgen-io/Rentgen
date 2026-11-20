import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { PostmanUrlencodedItem } from 'shared/types/postman';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectBodyUrlencoded, selectHighlightColor, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { EditableRow, useEditableRows } from './useEditableRows';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

type Row = EditableRow<PostmanUrlencodedItem>;

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

  const { rows, changeRow, removeRow } = useEditableRows({
    items,
    isEmpty: isEmptyRow,
    isSame: isSameItems,
    toItem,
    onChange: (nextItems) => dispatch(requestActions.setBodyUrlencoded(nextItems)),
  });

  const deleteRow = (id: string) => {
    removeRow(id);
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
          onChange={(event) => changeRow(row.id, { key: event.target.value })}
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
          onChange={(event) => changeRow(row.id, { value: event.target.value })}
        />
      ),
    },
    {
      cell: (row) =>
        isEmptyRow(row) ? null : (
          <TrashIcon
            className="size-3 text-muted-foreground hover:text-red-600 cursor-pointer"
            onClick={() => deleteRow(row.id)}
          />
        ),
      width: '40px',
      center: true,
    },
  ];

  return <DataTable className="urlencoded-data-table" columns={columns} data={rows} keyField="id" />;
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

function isSameItems(a: PostmanUrlencodedItem[], b: PostmanUrlencodedItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every(
    (item, index) =>
      item.key === b[index].key &&
      item.value === b[index].value &&
      item.disabled === b[index].disabled &&
      item.description === b[index].description,
  );
}
