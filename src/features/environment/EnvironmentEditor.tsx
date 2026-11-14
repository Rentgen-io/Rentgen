import cn from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { IconButton } from 'src/components/buttons/IconButton';
import { CreatableSelect } from 'src/components/inputs/CreatableSelect';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Input from 'src/components/inputs/Input';
import { SelectOption } from 'src/components/inputs/Select';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDynamicVariables, selectEnvironments } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { DataType, DynamicVariable, Environment, EnvironmentVariable } from 'src/types';
import { generateEnvironmentId } from 'src/utils';
import { notify } from 'src/utils/toast';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import TrashIcon from 'src/assets/icons/trash-icon.svg';

const COLOR_OPTIONS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];
const DEFAULT_COLOR = '#3B82F6';
// Changes of an existing environment are saved after this pause in typing
const AUTOSAVE_DELAY = 500;

// A static variable row; `id` only identifies the row while editing (stable table / React key), it isn't saved
interface StaticRow extends EnvironmentVariable {
  id: string;
  kind: 'static';
}

interface DynamicRow {
  id: string;
  kind: 'dynamic';
  variable: DynamicVariable;
}

type Row = StaticRow | DynamicRow;

interface Props {
  environment: Environment | null;
  isNew: boolean;
  onSave: (environment: Environment) => void;
}

/**
 * Edits one environment. Keyed by the environment id (see App), so the form state starts from the environment and is
 * never overwritten by the environment updates its own autosave causes.
 */
export default function EnvironmentEditor({ environment, isNew, onSave }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const allDynamicVariables = useAppSelector(selectDynamicVariables);

  const [title, setTitle] = useState<string>(environment?.title ?? '');
  const [color, setColor] = useState<string>(environment?.color ?? DEFAULT_COLOR);
  const [staticRows, setStaticRows] = useState<StaticRow[]>(() =>
    withTrailingEmptyRow((environment?.variables ?? []).map(createStaticRow)),
  );
  // Variable names being typed, by row id: committed on blur / Enter (an emptied name reverts), not on every keystroke
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

  const environmentId = environment?.id ?? null;

  const valueOptions = useMemo<SelectOption<DataType | (string & {}), string>[]>(
    () => [
      { value: 'randomEmail', label: t('environment.randomEmail') },
      { value: 'randomGuid', label: t('environment.randomGuid') },
      { value: 'randomInt', label: t('environment.randomInteger') },
      { value: 'randomString', label: t('environment.randomString') },
    ],
    [t],
  );

  // The dynamic variables applying in the edited environment: the global ones and its own
  const dynamicRows = useMemo<DynamicRow[]>(
    () =>
      allDynamicVariables
        .filter((variable) => variable.environmentId === null || variable.environmentId === environmentId)
        .map((variable) => ({ id: variable.id, kind: 'dynamic', variable })),
    [allDynamicVariables, environmentId],
  );

  const rows = useMemo<Row[]>(() => [...dynamicRows, ...staticRows], [dynamicRows, staticRows]);

  // Names used more than once: only one of them takes effect (dynamic variables override static ones), so all are marked
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = (row.kind === 'static' ? row.key : row.variable.key).trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [rows]);

  // The environment as it would be saved: trimmed title (or "Untitled"), only variables with a name
  const draftEnvironment = useMemo<Environment>(
    () => ({
      id: environmentId ?? '',
      title: title.trim() || t('environment.untitled'),
      color,
      variables: staticRows.filter(({ key }) => key.trim() !== '').map(({ key, value }) => ({ key, value })),
    }),
    [color, environmentId, staticRows, t, title],
  );

  // In refs, so the autosave isn't restarted by a new onSave function (App passes an inline one) and the pending save
  // can still run when the editor closes
  const onSaveRef = useRef(onSave);
  const pendingSaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // Silent autosave of an existing environment (only creating one is confirmed). Compares the normalized draft, so e.g.
  // a trailing space doesn't cause a save
  useEffect(() => {
    pendingSaveRef.current = null;
    if (isNew || !environment || isSameEnvironment(draftEnvironment, environment)) return;

    const save = () => {
      pendingSaveRef.current = null;
      // Also runs when the editor closes: not for an environment deleted meanwhile (saving would add it back)
      if (!selectEnvironments(store.getState()).some(({ id }) => id === draftEnvironment.id)) return;

      onSaveRef.current(draftEnvironment);
    };

    pendingSaveRef.current = save;
    const timeoutId = setTimeout(save, AUTOSAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [draftEnvironment, environment, isNew]);

  // Closing the editor (or switching to another environment) within the delay still saves the last changes
  useEffect(() => () => pendingSaveRef.current?.(), []);

  const handleSave = () => {
    onSave({ ...draftEnvironment, id: generateEnvironmentId() });
    notify.success(t('common.saved'), { toastId: 'success-save-environment' });
  };

  const changeStaticRow = useCallback((id: string, field: 'key' | 'value', newValue: string) => {
    setStaticRows((prev) =>
      withTrailingEmptyRow(
        prev
          .map((row) => (row.id === id ? { ...row, [field]: newValue } : row))
          // Other rows emptied meanwhile are dropped; the edited one stays while it's being typed in
          .filter((row) => row.id === id || !isEmptyRow(row)),
      ),
    );
  }, []);

  const dropNameDraft = useCallback((id: string) => {
    setNameDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const removeRow = useCallback(
    (row: Row) => {
      dropNameDraft(row.id);

      if (row.kind === 'static') setStaticRows((prev) => withTrailingEmptyRow(prev.filter(({ id }) => id !== row.id)));
      else dispatch(environmentActions.removeDynamicVariable({ id: row.id }));
    },
    [dispatch, dropNameDraft],
  );

  const commitName = useCallback(
    (row: Row) => {
      const name = nameDrafts[row.id]?.trim();
      const currentName = row.kind === 'static' ? row.key : row.variable.key;
      dropNameDraft(row.id);

      // An emptied name reverts to the previous one (deleting is done with the trash icon)
      if (!name || name === currentName) return;

      if (row.kind === 'static') {
        changeStaticRow(row.id, 'key', name);
        return;
      }

      // Like when setting a variable: a name may be used once per environment (a global one applies in all of them)
      const { environmentId, id } = row.variable;
      const isTaken = allDynamicVariables.some(
        (other) =>
          other.id !== id &&
          other.key === name &&
          (other.environmentId === null || environmentId === null || other.environmentId === environmentId),
      );
      if (isTaken) {
        notify.error(t('environment.duplicateVariable'), { toastId: 'error-rename-dynamic-variable' });
        return;
      }

      dispatch(environmentActions.updateDynamicVariable({ id, updates: { key: name } }));
    },
    [allDynamicVariables, nameDrafts, changeStaticRow, dispatch, dropNameDraft, t],
  );

  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      {
        name: t('environment.variableName'),
        width: 'calc(1/3 * 100%)',
        cell: (row) => {
          const name = nameDrafts[row.id] ?? (row.kind === 'static' ? row.key : row.variable.key);
          const isDuplicate = duplicateNames.has(name.trim());

          return (
            <div className="relative flex items-center w-full group">
              <Input
                className={cn('w-full border-0 bg-transparent', { 'text-red-700 dark:text-red-400': isDuplicate })}
                placeholder={t('environment.addVariable')}
                title={isDuplicate ? t('environment.duplicateVariable') : name}
                value={name}
                onBlur={() => commitName(row)}
                onChange={(event) => setNameDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
              {name && (
                <div className="absolute top-0 bottom-0 right-0 flex items-center gap-2 px-2 bg-background opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    aria-label={t('common.delete')}
                    className="flex p-0 border-0 bg-transparent text-muted-foreground hover:text-red-600 cursor-pointer"
                    title={t('common.delete')}
                    type="button"
                    onClick={() => removeRow(row)}
                  >
                    <TrashIcon className="size-3" />
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
      {
        name: t('environment.value'),
        width: 'calc(2/3 * 100%)',
        cell: (row) => {
          if (row.kind === 'static')
            return (
              <CreatableSelect
                classNames={{
                  container: () => 'w-full',
                  control: () => 'border-none!',
                }}
                options={valueOptions}
                value={
                  valueOptions.find((option) => option.value === row.value) ?? { value: row.value, label: row.value }
                }
                onChange={(option) => changeStaticRow(row.id, 'value', option?.value ?? '')}
              />
            );

          return (
            <span
              className="py-2 px-3 text-xs font-monospace text-muted-foreground truncate block w-fit min-w-0"
              title={row.variable.currentValue || undefined}
            >
              {row.variable.currentValue || '—'}
            </span>
          );
        },
      },
    ],
    [duplicateNames, nameDrafts, valueOptions, changeStaticRow, commitName, removeRow, t],
  );

  return (
    <div className="relative flex flex-col flex-auto">
      <h5 className="m-0 py-3 px-4 bg-surface border-b border-border">
        {isNew ? t('environment.newEnvironment') : t('environment.editEnvironment')}
      </h5>
      <IconButton
        aria-label={t('common.close')}
        buttonType={ButtonType.SECONDARY_OUTLINE}
        className="absolute top-1.5 right-1.5"
        title={t('common.close')}
        onClick={() => dispatch(environmentActions.stopEditing())}
      >
        <ClearCrossIcon className="size-5" />
      </IconButton>
      <div className="flex flex-col flex-auto gap-4 py-3 px-4">
        <div className="flex flex-col gap-2">
          <FieldLabel label={t('environment.environmentName')} required />
          <Input
            placeholder={t('environment.environmentNamePlaceholder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel label={t('environment.color')} required />
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                aria-label={option}
                aria-pressed={color.toUpperCase() === option}
                className={cn(
                  'size-8 border-2 rounded cursor-pointer',
                  color.toUpperCase() === option ? 'border-foreground' : 'border-transparent',
                )}
                style={{ backgroundColor: option }}
                title={option}
                type="button"
                onClick={() => setColor(option)}
              />
            ))}
            <input
              aria-label={t('environment.color')}
              className="w-10 h-8 cursor-pointer border-0 p-0"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col flex-auto gap-2">
          <FieldLabel label={t('environment.variables')} />
          <div className="flex flex-col flex-auto h-0 min-h-17! table-layout">
            <DataTable
              className="environment-data-table"
              columns={columns}
              data={rows}
              fixedHeader={true}
              keyField="id"
            />
          </div>
        </div>
        {isNew && (
          <Button className="w-fit self-end" onClick={handleSave}>
            {t('common.create')}
          </Button>
        )}
      </div>
    </div>
  );
}

// Row ids only need to be unique while the app runs
let nextStaticRowId = 0;

function createStaticRow(variable: EnvironmentVariable = { key: '', value: '' }): StaticRow {
  return { ...variable, id: `static-${nextStaticRowId++}`, kind: 'static' };
}

function isEmptyRow({ key, value }: EnvironmentVariable): boolean {
  return key.trim() === '' && value.trim() === '';
}

/** Keeps exactly one empty row at the end, for adding a variable. */
function withTrailingEmptyRow(rows: StaticRow[]): StaticRow[] {
  const lastRow = rows[rows.length - 1];
  return lastRow && isEmptyRow(lastRow) ? rows : [...rows, createStaticRow()];
}

function isSameEnvironment(a: Environment, b: Environment): boolean {
  return (
    a.title === b.title &&
    a.color === b.color &&
    a.variables.length === b.variables.length &&
    a.variables.every(
      (variable, index) => variable.key === b.variables[index].key && variable.value === b.variables[index].value,
    )
  );
}
