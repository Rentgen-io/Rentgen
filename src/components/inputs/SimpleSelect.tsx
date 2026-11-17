import cn from 'classnames';
import { SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { SelectOption } from './Select';

export interface SelectOptionGroup<T> {
  label: string;
  options: SelectOption<T>[];
}

type SimpleSelectItem = SelectOption<string> | SelectOptionGroup<string>;

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SimpleSelectItem[];
  placeholder?: string;
}

const isGroup = (item: SimpleSelectItem): item is SelectOptionGroup<string> => 'options' in item;

export default function SimpleSelect({ className, disabled, options, placeholder, ...otherProps }: Props) {
  const optionClassName =
    options
      .flatMap((item) => (isGroup(item) ? item.options : [item]))
      .find((option) => option.value === otherProps.value)?.className || '';

  const renderOption = (option: SelectOption<string>) => (
    <option key={option.value} value={option.value} className={option.className}>
      {option.label}
    </option>
  );

  return (
    <select
      className={twMerge(
        cn(
          { 'opacity-50': disabled },
          'm-0 py-1.75 px-3 font-segoe-ui text-xs text-foreground bg-background border border-border rounded outline-none',
          optionClassName,
          className,
        ),
      )}
      disabled={disabled}
      {...otherProps}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((item) =>
        isGroup(item) ? (
          <optgroup className="text-foreground bg-background" key={item.label} label={item.label}>
            {item.options.map(renderOption)}
          </optgroup>
        ) : (
          renderOption(item)
        ),
      )}
    </select>
  );
}
