import cn from 'classnames';
import ReactSelect, { ClassNamesConfig, GroupBase, Props as ReactSelectProps } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { twMerge } from 'tailwind-merge';

export interface SelectOption<T> {
  value: T;
  label: string;
  className?: string;
}

type SelectClassNames<T, IsMulti extends boolean> = ClassNamesConfig<
  SelectOption<T>,
  IsMulti,
  GroupBase<SelectOption<T>>
>;

export interface Props<T, IsMulti extends boolean> extends Omit<
  ReactSelectProps<SelectOption<T>, IsMulti, GroupBase<SelectOption<T>>>,
  'options'
> {
  isCreatable?: boolean;
  options?: readonly SelectOption<T>[];
}

export default function Select<T, IsMulti extends boolean = false>({
  classNames,
  isCreatable,
  styles,
  ...otherProps
}: Props<T, IsMulti>) {
  const selectClassNames = mergeClassNames<T, IsMulti>(
    {
      container: () => 'min-w-27.5 text-xs',
      control: () =>
        cn('min-h-auto! rounded-none! border! shadow-none! transition-none!', {
          'bg-white! dark:bg-dark-input! border-border! dark:border-dark-border!': !styles?.control,
        }),
      dropdownIndicator: () =>
        cn('w-7! p-1.5! transition-none!', !styles?.dropdownIndicator && 'text-text/40! dark:text-dark-text/40!'),
      indicatorSeparator: () => 'hidden',
      input: () => 'm-0! p-0! text-text! dark:text-dark-text!',
      menu: () => 'm-0! rounded-none! dark:bg-dark-input! transition-none! shadow-lg! z-50!',
      menuList: () => 'p-0!',
      option: ({ data, isSelected }) =>
        cn(
          'rounded-none transition-none',
          {
            'text-white!': isSelected,
            'hover:bg-select-hover dark:bg-dark-input! dark:hover:bg-dark-button-secondary!': !isSelected,
            'text-text! dark:text-dark-text!': !data.className && !isSelected,
          },
          !isSelected ? data.className : undefined,
        ),
      placeholder: () => 'm-0!',
      singleValue: ({ data, isDisabled }) =>
        cn(
          'm-0!',
          !styles?.singleValue && {
            'text-text/50! dark:text-dark-text/50!': isDisabled,
            'text-text! dark:text-dark-text!': !data.className,
          },
          data.className,
        ),
      valueContainer: () => 'py-2! px-3!',
    },
    classNames,
  );

  if (isCreatable)
    return (
      <CreatableSelect
        {...otherProps}
        classNames={selectClassNames}
        styles={styles}
        formatCreateLabel={(value) => value}
      />
    );

  return <ReactSelect classNames={selectClassNames} styles={styles} {...otherProps} />;
}

export function mergeClassNames<T, IsMulti extends boolean>(
  base: SelectClassNames<T, IsMulti>,
  overrides: SelectClassNames<T, IsMulti> = {},
): SelectClassNames<T, IsMulti> {
  const keys = new Set([...Object.keys(base), ...Object.keys(overrides)]) as Set<keyof SelectClassNames<T, IsMulti>>;
  const merged: Record<string, (state: unknown) => string> = {};

  keys.forEach((key) => {
    const baseClass = base[key] as ((state: unknown) => string) | undefined;
    const overrideClass = overrides[key] as ((state: unknown) => string) | undefined;

    merged[key] = (state) => twMerge(baseClass?.(state), overrideClass?.(state));
  });

  return merged as SelectClassNames<T, IsMulti>;
}
