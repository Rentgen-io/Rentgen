import ReactSelect, { ClassNamesConfig, GroupBase, Props as SelectProps } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import cn from 'classnames';
import { twMerge } from 'tailwind-merge';

type SelectClassNames = ClassNamesConfig<unknown, boolean, GroupBase<unknown>>;

export interface SelectOption<T> {
  value: T;
  label: string;
  className?: string;
}

interface Props extends SelectProps {
  isCreatable?: boolean;
}

export default function Select({ classNames, styles, isCreatable, ...otherProps }: Props) {
  const selectClassNames = mergeClassNames(
    {
      container: () => 'min-w-[110px] text-xs',
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
          'rounded-none! transition-none! cursor-pointer!',
          {
            'text-white!': isSelected,
            'hover:bg-select-hover dark:bg-dark-input! dark:hover:bg-dark-button-secondary!': !isSelected,
            'text-text! dark:text-dark-text!': !(data as SelectOption<unknown>).className,
          },
          !isSelected ? (data as SelectOption<unknown>).className : undefined,
        ),
      placeholder: () => 'm-0!',
      singleValue: ({ data, isDisabled }) =>
        cn(
          'm-0!',
          !styles?.singleValue && {
            'text-text/50! dark:text-dark-text/50!': isDisabled,
            'text-text! dark:text-dark-text!': !(data as SelectOption<unknown>).className,
          },
          (data as SelectOption<unknown>).className,
        ),
      valueContainer: () => 'py-2! px-3!',
    },
    classNames,
  );

  if (isCreatable)
    return (
      <CreatableSelect
        {...otherProps}
        styles={styles}
        classNames={selectClassNames}
        formatCreateLabel={(value) => value}
      />
    );

  return <ReactSelect {...otherProps} styles={styles} classNames={selectClassNames} />;
}

function mergeClassNames(base: SelectClassNames, overrides: SelectClassNames = {}): SelectClassNames {
  const keys = new Set([...Object.keys(base), ...Object.keys(overrides)]) as Set<keyof SelectClassNames>;
  const merged: Record<string, (state: unknown) => string> = {};

  keys.forEach((key) => {
    const baseClass = base[key] as ((state: unknown) => string) | undefined;
    const overrideClass = overrides[key] as ((state: unknown) => string) | undefined;

    merged[key] = (state) => twMerge(baseClass?.(state), overrideClass?.(state));
  });

  return merged as SelectClassNames;
}
