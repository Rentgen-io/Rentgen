import cn from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DataTable from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectDynamicVariables, selectSelectedEnvironmentId, selectTheme } from '../../store/selectors';
import { environmentActions } from '../../store/slices/environmentSlice';
import { DataType, DynamicVariable, Environment, EnvironmentVariable } from '../../types';
import { generateEnvironmentId } from '../../utils';
import Button from '../buttons/Button';
import Input from '../inputs/Input';
import Select, { SelectOption } from '../inputs/Select';
import Panel from '../panels/Panel';

const COLOR_OPTIONS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

interface Props {
  environment: Environment | null;
  isNew: boolean;
  onSave: (environment: Environment) => void;
}

export default function EnvironmentEditor({ environment, isNew, onSave }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const allDynamicVariables = useAppSelector(selectDynamicVariables);
  const selectedEnvironmentId = useAppSelector(selectSelectedEnvironmentId);
  const theme = useAppSelector(selectTheme);

  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[4]); // Default blue
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Filter dynamic variables applicable to current environment
  const dynamicVariables = useMemo(() => {
    return allDynamicVariables.filter((dv) => dv.environmentId === null || dv.environmentId === selectedEnvironmentId);
  }, [allDynamicVariables, selectedEnvironmentId]);

  const allVariables = useMemo(() => {
    return [
      ...dynamicVariables.map((dynamicVariable, index) => ({ ...dynamicVariable, type: 'dynamic', index })),
      ...variables.map((variable, index) => ({ ...variable, type: 'static', index })),
    ];
  }, [dynamicVariables, variables]);

  const isDark = theme === 'dark';

  // Check if current state differs from environment prop
  const hasChanges = () => {
    if (!environment) return false;
    if (title !== environment.title) return true;
    if (color !== environment.color) return true;

    const nonEmptyVars = variables.filter((v) => v.key.trim() !== '');
    if (nonEmptyVars.length !== environment.variables.length) return true;

    return nonEmptyVars.some((v, i) => {
      const envVar = environment.variables[i];
      return !envVar || v.key !== envVar.key || v.value !== envVar.value;
    });
  };

  // Autosave for existing environments only
  useEffect(() => {
    if (isNew) return;
    if (!environment?.id) return;
    if (!hasChanges()) return;

    const timeoutId = setTimeout(() => {
      const nonEmptyVariables = variables.filter((v) => v.key.trim() !== '');
      onSave({
        id: environment.id,
        title: title.trim() || t('environment.untitled'),
        color,
        variables: nonEmptyVariables,
      });
      setSaved(true);
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 1000);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [title, color, variables, isNew, environment, onSave]);

  useEffect(() => {
    return () => clearTimeout(savedTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (environment) {
      setTitle(environment.title);
      setColor(environment.color);
      setVariables([...environment.variables, { key: '', value: '' }]);
    } else {
      setTitle('');
      setColor(COLOR_OPTIONS[4]);
      setVariables([{ key: '', value: '' }]);
    }
  }, [environment]);

  const handleVariableChange = (index: number, field: 'key' | 'value', newValue: string) => {
    setVariables((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: newValue };

      const result = updated.filter((v, i) => {
        const isEmpty = v.key.trim() === '' && v.value.trim() === '';
        if (!isEmpty) return true;

        return i === index;
      });

      const lastRow = result[result.length - 1];
      const lastIsEmpty = lastRow && lastRow.key.trim() === '' && lastRow.value.trim() === '';
      if (!lastIsEmpty) result.push({ key: '', value: '' });

      return result;
    });
  };

  const handleSave = () => {
    const nonEmptyVariables = variables.filter((v) => v.key.trim() !== '');
    const savedEnvironment: Environment = {
      id: environment?.id || generateEnvironmentId(),
      title: title.trim() || t('environment.untitled'),
      color,
      variables: nonEmptyVariables,
    };

    onSave(savedEnvironment);

    if (!isNew) {
      clearTimeout(savedTimeoutRef.current);
      setSaved(true);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 1000);
    }
  };

  const handleDynamicVariableKeyChange = useCallback(
    (dv: DynamicVariable, newKey: string) => {
      if (newKey.trim() === '') dispatch(environmentActions.removeDynamicVariable({ id: dv.id }));
      else
        dispatch(
          environmentActions.updateDynamicVariable({
            id: dv.id,
            updates: { key: newKey },
          }),
        );

      clearTimeout(savedTimeoutRef.current);
      setSaved(true);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 1000);
    },
    [dispatch],
  );

  return (
    <Panel title={isNew ? t('environment.newEnvironment') : t('environment.editEnvironment')}>
      <div className="p-4 border-t border-border dark:border-dark-body">
        <div className="mb-4">
          <label className="block mb-1 font-bold text-sm">{t('environment.environmentName')}</label>
          <Input
            className="w-full dark:bg-dark-body"
            placeholder={t('environment.environmentNamePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-bold text-sm">{t('environment.color')}</label>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                className={cn(
                  'w-8 h-8 rounded-md border-2 cursor-pointer',
                  color === c ? 'border-text dark:border-dark-text' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                type="button"
              />
            ))}
            <input
              className="w-10 h-8 cursor-pointer border-0 p-0 rounded-md"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-bold text-sm">{t('environment.variables')}</label>
          <div className="border border-border dark:border-dark-body rounded-md overflow-hidden">
            <DataTable
              className="rounded-none!"
              columns={[
                {
                  name: t('environment.variableName'),
                  cell: (row) => (
                    <Input
                      className="w-full border-0 bg-transparent"
                      placeholder={t('environment.addVariable')}
                      title={row.key}
                      value={row.key}
                      onChange={(e) =>
                        row.type === 'static'
                          ? handleVariableChange(row.index, 'key', e.target.value)
                          : handleDynamicVariableKeyChange(row as DynamicVariable, e.target.value)
                      }
                    />
                  ),
                },
                {
                  name: t('environment.value'),
                  grow: 3,
                  cell: (row) => {
                    if (row.type === 'static')
                      return (
                        <EnvironmentVariableSelect
                          key={(row as EnvironmentVariable).value}
                          value={(row as EnvironmentVariable).value}
                          handleVariableChange={(value) => handleVariableChange(row.index, 'value', value)}
                        />
                      );

                    return (
                      <span
                        className="px-2 text-xs font-monospace text-text-secondary dark:text-dark-text-secondary truncate block w-full min-w-0"
                        title={(row as DynamicVariable).currentValue || ''}
                      >
                        {(row as DynamicVariable).currentValue || '—'}
                      </span>
                    );
                  },
                },
              ]}
              customStyles={{
                headRow: {
                  style: {
                    minHeight: 'auto',
                    color: isDark ? 'white' : 'black',
                    backgroundColor: isDark ? '#23272f' : '#fafafa',
                  },
                },
                headCells: {
                  style: {
                    padding: '8px 12px',
                  },
                },
                cells: {
                  style: {
                    padding: '4px',
                    overflow: 'hidden',
                    '&:not(:last-of-type)': {
                      borderRight: isDark ? '1px solid #23272f' : '1px solid #cccccc',
                    },
                  },
                },
                responsiveWrapper: {
                  style: {
                    overflowX: 'hidden',
                  },
                },
                tableWrapper: {
                  style: {
                    display: 'block',
                  },
                },
                rows: {
                  style: {
                    minHeight: 'auto',
                    backgroundColor: 'transparent',
                    '&:not(:last-of-type)': {
                      borderBottomColor: isDark ? '#23272f' : '#cccccc',
                    },
                  },
                },
                table: {
                  style: {
                    backgroundColor: 'transparent',
                  },
                },
              }}
              data={allVariables}
              fixedHeader={true}
              fixedHeaderScrollHeight="440px"
            />
          </div>
        </div>

        {isNew && (
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleSave}>{t('common.create')}</Button>
          </div>
        )}

        {!isNew && saved && (
          <div className="flex items-center justify-end">
            <span className="text-xs text-green-500">{t('common.saved')}</span>
          </div>
        )}
      </div>
    </Panel>
  );
}

function EnvironmentVariableSelect({
  value,
  handleVariableChange,
}: {
  value: string;
  handleVariableChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const options: SelectOption<DataType>[] = [
    { value: 'randomEmail', label: t('environment.randomEmail') },
    { value: 'randomInt', label: t('environment.randomInteger') },
    { value: 'randomString', label: t('environment.randomString') },
  ];
  const selected = options.find((option) => option.value == value) || {
    value: value,
    label: value,
  };
  const [inputValue, setInputValue] = useState(selected.label);

  return (
    <Select
      classNames={{
        container: () => 'w-full text-xs overflow-hidden',
        control: () =>
          'min-h-auto! border-none! bg-white! dark:bg-dark-input! shadow-none! transition-none! overflow-hidden!',
        input: () => 'm-0! p-0! text-text! dark:text-dark-text! [&>*]:opacity-100!',
        singleValue: () => 'm-0! text-text! dark:text-dark-text! overflow-hidden! text-ellipsis! whitespace-nowrap!',
      }}
      isCreatable={true}
      menuPosition="fixed"
      options={options}
      placeholder={t('environment.value')}
      value={selected}
      defaultInputValue={selected.label}
      inputValue={inputValue}
      onInputChange={(value, meta) => {
        if (meta.action === 'input-change') setInputValue(value);
        if (meta.action === 'input-blur') setInputValue(selected.label);
      }}
      onChange={(option) => handleVariableChange((option as SelectOption<DataType>).value)}
    />
  );
}
