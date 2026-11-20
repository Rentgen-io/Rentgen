import { ChangeEvent, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataType, FileFormat, Interval, ParameterValue } from 'shared/types/testing';
import { FILE_FORMAT_GROUPS } from 'shared/utils/test-files';
import { IconButton } from 'src/components/buttons/IconButton';
import Input from 'src/components/inputs/Input';
import { SelectOption } from 'src/components/inputs/Select';
import SimpleSelect, { SelectOptionGroup } from 'src/components/inputs/SimpleSelect';
import Toggle from 'src/components/inputs/Toggle';
import { useAppSelector } from 'src/store/hooks';
import { selectTestEngineConfiguration } from 'src/store/selectors';
import { isParameterTestSkipped } from 'src/test-engine';
import { getInitialParameterValue } from 'src/test-engine/parameters';
import { clamp, normalizeDecimal } from 'src/utils/number';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';

// A decimal typed with only zeros after the point, e.g. "5.00"
const TRAILING_ZEROS_PATTERN = /^-?\d+[.,]0+$/;
// Added to such a value so it stays a decimal ("0.00 - decimal" in the hint) instead of becoming the integer 5;
// normalizeDecimal() rounds it away for display and in the tests
const DECIMAL_MARKER = 0.001;

const NUMBER_LIMITS: Interval = { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER };
const STRING_LENGTH_LIMITS: Interval = { min: 1, max: 1_000_000 };

const TYPE_OPTIONS: { value: DataType; labelKey: string }[] = [
  { value: 'do-not-test', labelKey: 'parameterTypes.doNotTest' },
  { value: 'randomEmail', labelKey: 'parameterTypes.randomEmail' },
  { value: 'randomGuid', labelKey: 'parameterTypes.randomGuid' },
  { value: 'randomInt', labelKey: 'parameterTypes.randomInteger' },
  { value: 'randomString', labelKey: 'parameterTypes.randomString' },
  { value: 'boolean', labelKey: 'parameterTypes.boolean' },
  { value: 'currency', labelKey: 'parameterTypes.currency' },
  { value: 'date_yyyy_mm_dd', labelKey: 'parameterTypes.dateYYYYMMDD' },
  { value: 'email', labelKey: 'parameterTypes.email' },
  { value: 'enum', labelKey: 'parameterTypes.enum' },
  { value: 'file', labelKey: 'parameterTypes.file' },
  { value: 'guid', labelKey: 'parameterTypes.guid' },
  { value: 'ipv4', labelKey: 'parameterTypes.ipv4' },
  { value: 'number', labelKey: 'parameterTypes.number' },
  { value: 'numeric_string', labelKey: 'parameterTypes.numericString' },
  { value: 'phone', labelKey: 'parameterTypes.phone' },
  { value: 'string', labelKey: 'parameterTypes.string' },
  { value: 'url', labelKey: 'parameterTypes.url' },
];

// The hint shown above the controls of the types that have settings
const HINT_KEYS: Partial<Record<DataType, string>> = {
  enum: 'controls.enumLabel',
  file: 'controls.fileLabel',
  number: 'controls.numberLabel',
  numeric_string: 'controls.numberLabel',
  string: 'controls.stringLabel',
};

const INPUT_CLASS_NAME = 'w-full p-1.25';

interface Props {
  canBeFile?: boolean;
  parameterValue: ParameterValue;
  onChange: (value: ParameterValue) => void;
}

/** The test settings of one body / query parameter: its type, the type's settings, and whether it's mandatory. */
export function ParameterControls({ canBeFile = false, parameterValue, onChange }: Props) {
  const { t } = useTranslation();

  const settings = useAppSelector(selectTestEngineConfiguration);
  const { number: numberSettings, string: stringSettings } = settings;

  const { mandatory, type, value } = parameterValue;
  const showFileOption = canBeFile || type === 'file';

  const typeOptions = useMemo<SelectOption<DataType>[]>(
    () =>
      TYPE_OPTIONS.filter((option) => showFileOption || option.value !== 'file').map(({ value, labelKey }) => ({
        value,
        label: t(labelKey),
      })),
    [showFileOption, t],
  );

  const fileFormatOptions = useMemo<SelectOptionGroup<FileFormat>[]>(
    () =>
      Object.entries(FILE_FORMAT_GROUPS).map(([group, formats]) => ({
        label: t(`controls.fileFormatGroups.${group}`),
        options: formats.map((format) => ({ value: format, label: format.toUpperCase() })),
      })),
    [t],
  );

  const isDoNotTest = type === 'do-not-test';
  const hintKey = type === 'file' && !canBeFile ? undefined : HINT_KEYS[type];

  const changeValue = (newValue: ParameterValue['value']) => onChange({ ...parameterValue, value: newValue });

  const changeType = (event: ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as DataType;

    // A type that isn't tested has no settings; it's mandatory unless it's "Do not test"
    onChange(
      isParameterTestSkipped(newType)
        ? getInitialParameterValue(newType, settings, '', newType !== 'do-not-test')
        : getInitialParameterValue(newType, settings),
    );
  };

  return (
    <div className="w-full max-w-110">
      {hintKey && <div className="mb-1 text-xs text-muted-foreground">{t(hintKey)}</div>}
      <div className="grid grid-cols-2 gap-2">
        {type === 'enum' && (
          <Input
            className={INPUT_CLASS_NAME}
            value={value as string}
            onChange={(event) => changeValue(event.target.value)}
          />
        )}
        {(type === 'number' || type === 'numeric_string') && (
          <IntervalInputs
            allowDecimals
            defaults={numberSettings}
            interval={value as Interval}
            limits={NUMBER_LIMITS}
            onChange={changeValue}
          />
        )}
        {type === 'string' && (
          <IntervalInputs
            defaults={{ min: stringSettings.minLength, max: stringSettings.maxLength }}
            interval={value as Interval}
            limits={STRING_LENGTH_LIMITS}
            onChange={changeValue}
          />
        )}
        {canBeFile && type === 'file' && (
          <SimpleSelect
            className="w-full p-1"
            options={fileFormatOptions}
            multiple
            size={1}
            value={Array.isArray(value) ? value : []}
            onChange={(event) => {
              const formats = Array.from(event.target.selectedOptions, (option) => option.value as FileFormat);
              changeValue(formats);
            }}
          />
        )}
        <div className="col-start-2 flex items-center gap-1">
          <SimpleSelect className="w-full p-1" options={typeOptions} value={type} onChange={changeType} />
          <IconButton
            aria-label={t('parameterTypes.doNotTest')}
            className="size-7 shrink-0"
            title={t('parameterTypes.doNotTest')}
            onClick={() => onChange({ type: 'do-not-test', value: '', mandatory: false })}
          >
            <ClearCrossIcon className="size-4" />
          </IconButton>
          <Toggle
            checked={mandatory}
            disabled={isDoNotTest}
            title={isDoNotTest ? undefined : t('controls.mandatoryToggle')}
            onChange={(event) => onChange({ ...parameterValue, mandatory: event.target.checked })}
          />
        </div>
      </div>
    </div>
  );
}

// While a bound is being retyped it may be empty (null), although an Interval is always complete once it's committed
type IntervalDraft = { [K in keyof Interval]: number | null };

interface IntervalInputsProps {
  allowDecimals?: boolean;
  defaults: Interval;
  interval: Interval;
  limits: Interval;
  onChange: (interval: Interval) => void;
}

/**
 * The min / max bounds of a number or a string length. A bound is clamped to the limits while typed, may be emptied
 * while retyped, and on blur gets its default back when empty and is kept on its side of the other bound.
 */
function IntervalInputs({ allowDecimals = false, defaults, interval, limits, onChange }: IntervalInputsProps) {
  const { t } = useTranslation();

  const { min, max } = interval as IntervalDraft;

  // The draft is only incomplete between typing and blur, see IntervalDraft
  const changeInterval = (draft: IntervalDraft) => onChange(draft as Interval);

  const parseBound = (text: string): number | null => {
    if (!text) return null;

    const bound = clamp(Number(text), limits.min, limits.max);
    return allowDecimals && TRAILING_ZEROS_PATTERN.test(text) ? bound + DECIMAL_MARKER : bound;
  };

  const formatBound = (bound: number | null) => (bound === null ? '' : allowDecimals ? normalizeDecimal(bound) : bound);

  const commitMin = () => {
    const newMin = min ?? defaults.min;
    changeInterval({ min: max === null ? newMin : Math.min(newMin, max), max });
  };

  const commitMax = () => {
    const newMax = max ?? defaults.max;
    changeInterval({ min, max: min === null ? newMax : Math.max(min, newMax) });
  };

  const inputProps = { className: INPUT_CLASS_NAME, step: allowDecimals ? 0.01 : 1, type: 'number' };

  return (
    <div className="flex items-center gap-2">
      <Input
        {...inputProps}
        placeholder={t('controls.minPlaceholder')}
        value={formatBound(min)}
        onBlur={commitMin}
        onChange={(event) => changeInterval({ min: parseBound(event.target.value), max })}
      />
      <Input
        {...inputProps}
        placeholder={t('controls.maxPlaceholder')}
        value={formatBound(max)}
        onBlur={commitMax}
        onChange={(event) => changeInterval({ min, max: parseBound(event.target.value) })}
      />
    </div>
  );
}
