import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/hooks';
import { selectTestEngineConfiguration } from '../../store/selectors';
import { isParameterTestSkipped } from '../../tests';
import { DataType, Interval, ParameterValue } from '../../types';
import { clamp, getInitialParameterValue, normalizeDecimal } from '../../utils';
import { IconButton } from '../buttons/IconButton';
import Input from '../inputs/Input';
import { SelectOption } from '../inputs/Select';
import SimpleSelect from '../inputs/SimpleSelect';
import Toggle from '../inputs/Toggle';

import ClearCrossIcon from '../../assets/icons/clear-cross-icon.svg';

const MAX_INT32 = 2147483647;
const TRAILING_ZEROS_PATTERN = /^-?\d+[.,]0+$/;

interface Props {
  parameterValue: ParameterValue;
  onChange: (value: ParameterValue) => void;
}

export function ParameterControls({ parameterValue, onChange }: Props) {
  const testEngineConfiguration = useAppSelector(selectTestEngineConfiguration);
  const { t } = useTranslation();

  const parameterOptions: SelectOption<DataType>[] = [
    { value: 'do-not-test', label: t('parameterTypes.doNotTest') },
    { value: 'randomEmail', label: t('parameterTypes.randomEmail') },
    { value: 'randomInt', label: t('parameterTypes.randomInteger') },
    { value: 'randomString', label: t('parameterTypes.randomString') },
    { value: 'boolean', label: t('parameterTypes.boolean') },
    { value: 'currency', label: t('parameterTypes.currency') },
    { value: 'date_yyyy_mm_dd', label: t('parameterTypes.dateYYYYMMDD') },
    { value: 'email', label: t('parameterTypes.email') },
    { value: 'enum', label: t('parameterTypes.enum') },
    { value: 'ipv4', label: t('parameterTypes.ipv4') },
    { value: 'number', label: t('parameterTypes.number') },
    { value: 'numeric_string', label: t('parameterTypes.numericString') },
    { value: 'phone', label: t('parameterTypes.phone') },
    { value: 'string', label: t('parameterTypes.string') },
    { value: 'url', label: t('parameterTypes.url') },
  ];
  const { mandatory, type, value } = parameterValue;
  const inputClassName = 'w-full p-[5px] rounded-none dark:border-border/20';

  return (
    <div className="w-full max-w-110">
      {renderLabel()}
      <div className="grid grid-cols-2 gap-2">
        {type === 'enum' && (
          <Input
            className={inputClassName}
            value={value as string}
            onChange={(event) => onChange({ ...parameterValue, value: event.target.value })}
          />
        )}
        {(type === 'number' || type === 'numeric_string') && (
          <div className="flex items-center gap-2">
            <Input
              className={inputClassName}
              placeholder={t('controls.minPlaceholder')}
              step={0.01}
              type="number"
              value={normalizeDecimal((value as Interval).min) ?? ''}
              onBlur={() => onMinBlur(testEngineConfiguration.number.min)}
              onChange={(event) => onMinChange(event.target.value, -MAX_INT32, MAX_INT32)}
            />
            <Input
              className={inputClassName}
              placeholder={t('controls.maxPlaceholder')}
              step={0.01}
              type="number"
              value={normalizeDecimal((value as Interval).max) ?? ''}
              onBlur={() => onMaxBlur(testEngineConfiguration.number.max)}
              onChange={(event) => onMaxChange(event.target.value, -MAX_INT32, MAX_INT32)}
            />
          </div>
        )}
        {type === 'string' && (
          <div className="flex items-center gap-2">
            <Input
              className={inputClassName}
              placeholder={t('controls.minPlaceholder')}
              step={1}
              type="number"
              value={(value as Interval).min ?? ''}
              onBlur={() => onMinBlur(testEngineConfiguration.string.minLength)}
              onChange={(event) => onMinChange(event.target.value, 1, 1000000)}
            />
            <Input
              className={inputClassName}
              placeholder={t('controls.maxPlaceholder')}
              step={1}
              type="number"
              value={(value as Interval).max ?? ''}
              onBlur={() => onMaxBlur(testEngineConfiguration.string.maxLength)}
              onChange={(event) => onMaxChange(event.target.value, 1, 1000000)}
            />
          </div>
        )}
        <div className="col-start-2 flex items-center gap-1">
          <SimpleSelect
            className="w-full p-1 rounded-none dark:border-border/20"
            options={parameterOptions}
            value={type}
            onChange={onSelectTypeChange}
          />
          <Toggle
            checked={mandatory}
            disabled={isParameterTestSkipped(type)}
            title={!isParameterTestSkipped(type) ? t('controls.mandatoryToggle') : undefined}
            onChange={(e) => onChange({ ...parameterValue, mandatory: e.target.checked })}
          />
          <IconButton
            className="h-7 w-7 shrink-0"
            onClick={() => onChange({ type: 'do-not-test', value: '', mandatory: false })}
          >
            <ClearCrossIcon className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );

  function renderLabel() {
    let label: string | null = null;
    switch (type) {
      case 'enum':
        label = t('controls.enumLabel');
        break;
      case 'number':
      case 'numeric_string':
        label = t('controls.numberLabel');
        break;
      case 'string':
        label = t('controls.stringLabel');
        break;
    }

    if (!label) return null;

    return <div className="mb-1 text-xs text-text-secondary">{label}</div>;
  }

  function onMinBlur(minValue: number) {
    const min = (value as Interval).min;
    const max = (value as Interval).max;

    onChange({
      ...parameterValue,
      value: { ...(value as Interval), min: Math.min(min ?? minValue, max) },
    });
  }

  function onMaxBlur(maxValue: number) {
    const min = (value as Interval).min;
    const max = (value as Interval).max;

    onChange({
      ...parameterValue,
      value: { ...(value as Interval), max: Math.max(min, max ?? maxValue) },
    });
  }

  function onMinChange(value: string, minValue: number, maxValue: number) {
    if (!value) {
      onChange({ ...parameterValue, value: { ...(parameterValue.value as Interval), min: null } });
      return;
    }

    let min = clamp(Number(value), minValue, maxValue);
    if (TRAILING_ZEROS_PATTERN.test(value) && min !== null) min += 0.001; // to preserve trailing zeros in decimals

    onChange({ ...parameterValue, value: { ...(parameterValue.value as Interval), min } });
  }

  function onMaxChange(value: string, minValue: number, maxValue: number) {
    if (!value) {
      onChange({ ...parameterValue, value: { ...(parameterValue.value as Interval), max: null } });
      return;
    }

    let max = clamp(Number(value), minValue, maxValue);
    if (TRAILING_ZEROS_PATTERN.test(value) && max !== null) max += 0.001; // to preserve trailing zeros in decimals

    onChange({ ...parameterValue, value: { ...(parameterValue.value as Interval), max } });
  }

  function onSelectTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const type = event.target.value as DataType;
    if (isParameterTestSkipped(type)) onChange(getInitialParameterValue(type, '', false));
    else onChange(getInitialParameterValue(type));
  }
}
