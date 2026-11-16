import { useId, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { getFormDataFilePaths, toPostmanFilePath } from 'shared/utils/http';
import { selectFiles } from 'src/api/files';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import HighlightedInput from 'src/components/inputs/HighlightedInput';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectBodyFormData, selectHighlightColor, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { PostmanFormDataItem } from 'src/types';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import TrashIcon from 'src/assets/icons/trash-icon.svg';
import WarningIcon from 'src/assets/icons/warning-icon.svg';

type FieldType = NonNullable<PostmanFormDataItem['type']>;

const DEFAULT_TYPE: FieldType = 'text';

const typeOptions: SelectOption<FieldType, string>[] = [
  { label: 'Text', value: 'text' },
  { label: 'File', value: 'file' },
];

// A form-data field; `id` only identifies the row while editing (stable table / React key), it isn't saved
interface Row extends PostmanFormDataItem {
  id: string;
  value: string;
}

/**
 * Edits the form-data body fields of the request. Every change is written to the store (so a send always uses the
 * current fields) and the request is autosaved on blur, as the other request editors do.
 */
export default function FormDataTable() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const highlightColor = useAppSelector(selectHighlightColor);
  const items = useAppSelector(selectBodyFormData);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  const [rows, setRows] = useState<Row[]>(() => toRows(items));
  const [syncedItems, setSyncedItems] = useState<PostmanFormDataItem[] | undefined>(items);

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
    dispatch(requestActions.setBodyFormData(nextItems));
  };

  const changeRow = (id: string, changes: Partial<Pick<Row, 'key' | 'src' | 'type' | 'value'>>) =>
    updateRows(
      rows
        .map((row) => (row.id === id ? { ...row, ...changes } : row))
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
        <div className="flex w-full divide-x divide-border">
          <div className="flex-auto">
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
          </div>
          <div>
            <Select
              classNames={{
                control: () => 'border-none!',
              }}
              isSearchable={false}
              menuPosition="fixed"
              options={typeOptions}
              value={typeOptions.find((option) => option.value === (row.type ?? DEFAULT_TYPE))}
              onChange={(option) => {
                if (!option) return;

                changeRow(row.id, { type: option.value });
                autoSaveRequest();
              }}
            />
          </div>
        </div>
      ),
    },
    {
      name: t('request.value'),
      cell: (row) =>
        row.type === 'file' ? (
          <FileControls
            filePaths={getFormDataFilePaths(row)}
            onChange={(filePaths) => {
              changeRow(row.id, { src: toSrc(filePaths) });
              autoSaveRequest();
            }}
          />
        ) : (
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
            onClick={() => removeRow(row.id)}
          />
        ),
      width: '40px',
      center: true,
    },
  ];

  return <DataTable className="form-data-data-table" columns={columns} data={rows} keyField="id" />;
}

// Row ids only need to be unique while the app runs
let nextRowId = 0;

function createRow(item: PostmanFormDataItem = { key: '', value: '' }): Row {
  return { ...item, value: item.value ?? '', id: `form-data-${nextRowId++}` };
}

function toRows(items: PostmanFormDataItem[] | undefined): Row[] {
  return withTrailingEmptyRow((items ?? []).map((item) => createRow(item)));
}

function toItem(row: Row): PostmanFormDataItem {
  const type = row.type ?? DEFAULT_TYPE;
  const item: PostmanFormDataItem = { key: row.key, type };
  // As in Postman, a file field has only its files (`src`), no value
  if (type !== 'file') item.value = row.value;
  if (row.src !== undefined) item.src = row.src;
  if (row.disabled !== undefined) item.disabled = row.disabled;

  return item;
}

/** Whether nothing is entered in the row; the value of a file field (not shown, not saved) doesn't count. */
function isEmptyRow(item: PostmanFormDataItem): boolean {
  const hasValue = item.type !== 'file' && (item.value ?? '').trim() !== '';
  return item.key.trim() === '' && !hasValue && getFormDataFilePaths(item).length === 0;
}

/** Postman stores one file as a path and several as an array of paths. */
function toSrc(filePaths: string[]): PostmanFormDataItem['src'] {
  if (filePaths.length === 0) return undefined;

  return filePaths.length === 1 ? filePaths[0] : filePaths;
}

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

/** Keeps exactly one empty row at the end, for adding a field. */
function withTrailingEmptyRow(rows: Row[]): Row[] {
  const lastRow = rows[rows.length - 1];
  return lastRow && isEmptyRow(lastRow) ? rows : [...rows, createRow()];
}

function isSameItems(a: PostmanFormDataItem[] | undefined, b: PostmanFormDataItem[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  return a.every(
    (item, index) =>
      item.key === b[index].key &&
      (item.value ?? '') === (b[index].value ?? '') &&
      (item.type ?? DEFAULT_TYPE) === (b[index].type ?? DEFAULT_TYPE) &&
      getFormDataFilePaths(item).join('\n') === getFormDataFilePaths(b[index]).join('\n') &&
      item.disabled === b[index].disabled,
  );
}

/**
 * The files of a file field, as in Postman: a button to select them, then one chip (the file name, or how many files
 * there are) whose cross clears the selection.
 */
function FileControls({ filePaths, onChange }: { filePaths: string[]; onChange: (filePaths: string[]) => void }) {
  const { t } = useTranslation();
  const tooltipId = useId();

  const chooseFiles = async () => {
    const selectedPaths = await selectFiles();
    if (selectedPaths.length) onChange(selectedPaths.map(toPostmanFilePath));
  };

  return (
    <div className="flex flex-auto items-center justify-between h-fit min-w-0 py-1.5 px-2.5 text-foreground">
      {filePaths.length ? (
        <>
          <div
            className="flex items-center gap-1 py-px pl-1 text-[11px] border border-foreground/20 rounded truncate"
            title={filePaths.join('\n')}
          >
            <span className="truncate">
              {filePaths.length === 1
                ? getFileName(filePaths[0])
                : t('request.filesSelected', { count: filePaths.length })}
            </span>
            <ClearCrossIcon
              className="size-3.5 shrink-0 hover:text-red-600 cursor-pointer"
              onClick={() => onChange([])}
            />
          </div>
          <WarningIcon className="size-3.5 shrink-0 text-yellow-600 cursor-help" data-tooltip-id={tooltipId} />
          <Tooltip id={tooltipId} place="bottom-start" positionStrategy="fixed">
            <div className="flex flex-col gap-2 max-w-60 text-xs">
              <p className="m-0">{t('request.localFileWarning')}</p>
            </div>
          </Tooltip>
        </>
      ) : (
        <Button
          buttonSize={ButtonSize.SMALL}
          buttonType={ButtonType.SECONDARY}
          className="inline-flex items-center text-[11px] leading-[1.2] truncate"
          onClick={chooseFiles}
        >
          {t('request.selectFiles')}
        </Button>
      )}
    </div>
  );
}
