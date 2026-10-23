import cn from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import Button from 'src/components/buttons/Button';
import { CreatableSelect } from 'src/components/inputs/CreatableSelect';
import Input from 'src/components/inputs/Input';
import { SelectOption } from 'src/components/inputs/Select';
import Panel from 'src/components/panels/Panel';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDynamicVariables, selectSelectedEnvironmentId } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { DataType, DynamicVariable, Environment, EnvironmentVariable } from 'src/types';
import { generateEnvironmentId } from 'src/utils';
import { notify } from 'src/utils/toast';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

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

  const [title, setTitle] = useState<string>('');
  const [color, setColor] = useState<string>(COLOR_OPTIONS[4]);
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);

  const options: SelectOption<DataType | (string & {})>[] = [
    { value: 'randomEmail', label: t('environment.randomEmail') },
    { value: 'randomGuid', label: t('environment.randomGuid') },
    { value: 'randomInt', label: t('environment.randomInteger') },
    { value: 'randomString', label: t('environment.randomString') },
  ];

  const dynamicVariables = useMemo(() => {
    return allDynamicVariables.filter((dv) => dv.environmentId === null || dv.environmentId === selectedEnvironmentId);
  }, [allDynamicVariables, selectedEnvironmentId]);

  const allVariables = useMemo(() => {
    return [
      ...dynamicVariables.map((dynamicVariable, index) => ({ ...dynamicVariable, type: 'dynamic', index })),
      ...variables.map((variable, index) => ({ ...variable, type: 'static', index })),
    ];
  }, [dynamicVariables, variables]);

  const hasChanges = () => {
    if (!environment) return false;
    if (title !== environment.title) return true;
    if (color !== environment.color) return true;

    const nonEmptyVariables = variables.filter((v) => v.key.trim() !== '');
    if (nonEmptyVariables.length !== environment.variables.length) return true;

    return nonEmptyVariables.some((v, i) => {
      const envVar = environment.variables[i];
      return !envVar || v.key !== envVar.key || v.value !== envVar.value;
    });
  };

  useEffect(() => {
    if (isNew) return;
    if (!environment?.id) return;
    if (!hasChanges()) return;

    const timeoutId = setTimeout(() => {
      onSave({
        id: environment.id,
        title: title.trim() || t('environment.untitled'),
        color,
        variables: variables.filter((v) => v.key.trim() !== ''),
      });

      notify.success(t('common.saved'), { toastId: 'success-save-environment' });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, color, variables, isNew, environment, onSave]);

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

    notify.success(t('common.saved'), { toastId: 'success-save-environment' });
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

      notify.success(t('common.saved'), { toastId: 'success-save-environment' });
    },
    [dispatch, t],
  );

  return (
    <Panel
      className="flex flex-col flex-auto border-none"
      collapsible={false}
      title={isNew ? t('environment.newEnvironment') : t('environment.editEnvironment')}
    >
      <div className="flex flex-col flex-auto gap-4 p-4 bg-body dark:bg-dark-body border-t border-border dark:border-dark-border">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-xs">{t('environment.environmentName')}</label>
          <Input
            className="w-full dark:bg-dark-body"
            placeholder={t('environment.environmentNamePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-bold text-xs">{t('environment.color')}</label>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                className={cn(
                  'w-8 h-8 border-2 cursor-pointer',
                  color === c ? 'border-text dark:border-dark-text' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                type="button"
              />
            ))}
            <input
              className="w-10 h-8 cursor-pointer border-0 p-0"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col flex-auto gap-2">
          <label className="font-bold text-xs">{t('environment.variables')}</label>
          <div className="flex flex-col flex-auto h-0 [&>div]:flex [&>div]:flex-col [&>div]:flex-auto [&>div]:h-0">
            <DataTable
              className="environment-data-table"
              columns={[
                {
                  name: t('environment.variableName'),
                  width: 'calc(1/3 * 100%)',
                  cell: (row) => (
                    <div className="relative flex items-center w-full group">
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
                      {row.key && (
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 right-0',
                            'flex items-center gap-2 px-2 bg-white dark:bg-dark-input opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <TrashIcon
                            className="h-3 w-3 text-button-text-secondary dark:text-text-secondary hover:text-button-danger cursor-pointer"
                            onClick={() =>
                              row.type === 'static'
                                ? handleVariableChange(row.index, 'key', '')
                                : handleDynamicVariableKeyChange(row as DynamicVariable, '')
                            }
                          />
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  name: t('environment.value'),
                  width: 'calc(2/3 * 100%)',
                  cell: (row) => {
                    if (row.type === 'static')
                      return (
                        <CreatableSelect
                          classNames={{
                            container: () => 'w-full',
                            control: () => 'border-none!',
                          }}
                          options={options}
                          value={
                            options.find((option) => option.value === (row as EnvironmentVariable).value) ?? {
                              value: (row as EnvironmentVariable).value,
                              label: (row as EnvironmentVariable).value,
                            }
                          }
                          onChange={(option) => handleVariableChange(row.index, 'value', option?.value ?? '')}
                        />
                      );

                    return (
                      <span
                        className="py-2! px-3! text-xs font-monospace text-text-secondary dark:text-dark-text-secondary truncate block w-full min-w-0"
                        title={(row as DynamicVariable).currentValue || ''}
                      >
                        {(row as DynamicVariable).currentValue || '—'}
                      </span>
                    );
                  },
                },
              ]}
              data={allVariables}
              fixedHeader={true}
            />
          </div>
        </div>
        {isNew && (
          <Button className="w-fit self-end" onClick={handleSave}>
            {t('common.create')}
          </Button>
        )}
      </div>
    </Panel>
  );
}
