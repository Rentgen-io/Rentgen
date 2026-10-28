import { useEffect, useMemo, useRef, useState } from 'react';
import Select, { SelectOption, Props as SelectProps, mergeClassNames } from './Select';

interface Props<T> extends Omit<SelectProps<T, false>, 'isCreatable' | 'value'> {
  value?: SelectOption<T>;
}

export function CreatableSelect<T>({
  classNames,
  menuPosition = 'fixed',
  options,
  value,
  placeholder,
  onChange,
  ...otherProps
}: Props<T>) {
  const selectedLabelRef = useRef(value?.label ?? '');
  const [customOptions, setCustomOptions] = useState<T[]>([]);
  const [inputValue, setInputValue] = useState<string>(value?.label ?? '');
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  const selectOptions = useMemo<SelectOption<T>[]>(() => {
    const presetValues = new Set(options?.map((option) => option.value));
    const customValues = [...new Set([...customOptions, value?.value])].filter(
      (customValue): customValue is T => !!customValue && !presetValues.has(customValue),
    );

    return [
      ...(options ?? []),
      ...customValues.map((customValue) => ({
        value: customValue,
        label: String(customValue),
      })),
    ];
  }, [options, customOptions, value]);

  useEffect(() => {
    setCustomOptions([]);
  }, [options]);

  useEffect(() => {
    selectedLabelRef.current = value?.label ?? '';
    setInputValue(value?.label ?? '');
  }, [value?.label]);

  useEffect(() => {
    if (
      value?.value &&
      !options?.some((option) => option.value === value.value) &&
      !customOptions.includes(value.value)
    )
      setCustomOptions((prevCustomOptions) => [...prevCustomOptions, value.value]);
  }, [value?.value]);

  return (
    <Select
      {...otherProps}
      classNames={mergeClassNames<T, false>(
        {
          input: () => 'grid-cols-[0_minmax(0,1fr)]! [&>*]:opacity-100!',
          valueContainer: () => 'grid-cols-[minmax(0,1fr)]!',
        },
        classNames,
      )}
      filterOption={isFiltering ? undefined : () => true}
      isCreatable={true}
      inputValue={inputValue}
      menuPosition={menuPosition}
      options={selectOptions}
      placeholder={placeholder ?? ''}
      value={value}
      onChange={(option, meta) => {
        if (!option) return;
        if (meta.action === 'create-option')
          setCustomOptions((prevCustomOptions) => [...prevCustomOptions, option.value]);

        onChange?.(option, meta);
        setInputValue(option.label);
        selectedLabelRef.current = option.label;
        setIsFiltering(false);
      }}
      onInputChange={(value, meta) => {
        if (meta.action === 'input-change') {
          setInputValue(value);
          setIsFiltering(true);
        }
        if (meta.action === 'input-blur') {
          setInputValue(selectedLabelRef.current);
          setIsFiltering(false);
        }
      }}
      onMenuClose={() => setIsFiltering(false)}
    />
  );
}
