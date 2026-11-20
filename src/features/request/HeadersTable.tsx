import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { PostmanHeader } from 'shared/types/postman';
import { isSameHeaders } from 'shared/utils/headers';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectHeaders, selectHighlightColor, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { EditableRow, useEditableRows } from './useEditableRows';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

type Row = EditableRow<PostmanHeader>;

/**
 * Edits the request headers. Every change is written to the store (so a send always uses the current headers) and
 * the request is autosaved on blur, as the other request editors do.
 */
export default function HeadersTable() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const highlightColor = useAppSelector(selectHighlightColor);
  const items = useAppSelector(selectHeaders);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  const { rows, changeRow, removeRow } = useEditableRows({
    items,
    isEmpty: isEmptyRow,
    isSame: isSameHeaders,
    toItem,
    onChange: (nextItems) => dispatch(requestActions.setHeaders(nextItems)),
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

  return <DataTable className="headers-data-table" columns={columns} data={rows} keyField="id" />;
}

function toItem({ key, value }: Row): PostmanHeader {
  return { key, value };
}

function isEmptyRow({ key, value }: PostmanHeader): boolean {
  return key.trim() === '' && value.trim() === '';
}
