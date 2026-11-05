import cn from 'classnames';
import { ReactNode } from 'react';
import ReactSelect, { ClassNamesConfig, GroupBase, Props as ReactSelectProps } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { twMerge } from 'tailwind-merge';

export interface SelectOption<T, L extends ReactNode = ReactNode> {
  value: T;
  label: L;
  className?: string;
}

type SelectClassNames<T, IsMulti extends boolean, L extends ReactNode = ReactNode> = ClassNamesConfig<
  SelectOption<T, L>,
  IsMulti,
  GroupBase<SelectOption<T, L>>
>;

export interface Props<T, IsMulti extends boolean, L extends ReactNode = ReactNode> extends Omit<
  ReactSelectProps<SelectOption<T, L>, IsMulti, GroupBase<SelectOption<T, L>>>,
  'options'
> {
  isCreatable?: boolean;
  options?: readonly SelectOption<T, L>[];
}

export default function Select<T, IsMulti extends boolean = false, L extends ReactNode = ReactNode>({
  classNames,
  isCreatable,
  styles,
  ...otherProps
}: Props<T, IsMulti, L>) {
  const selectClassNames = mergeClassNames<T, IsMulti, L>(
    {
      container: () => 'min-w-27.5 text-xs',
      control: () =>
        cn('min-h-auto! rounded! border! shadow-none! transition-none!', {
          'bg-background! border-border!': !styles?.control,
        }),
      dropdownIndicator: () => cn('w-7! p-1.5! transition-none!', !styles?.dropdownIndicator && 'text-foreground!'),
      indicatorSeparator: () => 'hidden',
      input: ({ getValue, isMulti }) => {
        const className = isMulti ? undefined : getValue()[0]?.className;
        return cn('m-0! p-0!', className ?? 'text-foreground!');
      },
      menu: () => 'm-0! rounded! transition-none! shadow-lg! z-50!',
      menuList: () => 'py-1! px-0! bg-background!',
      option: ({ data, isSelected, isDisabled }) =>
        cn(
          'rounded-none transition-none',
          {
            'bg-secondary-hover!': isSelected,
            'text-foreground!': !data.className,
            'bg-background! hover:bg-secondary-hover!': !isSelected,
            'cursor-pointer!': !isDisabled,
          },
          data.className,
        ),
      placeholder: () => 'm-0!',
      singleValue: ({ data, isDisabled }) =>
        cn(
          'm-0!',
          !styles?.singleValue && {
            'text-foreground/50!': isDisabled,
            'text-foreground!': !data.className,
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

export function mergeClassNames<T, IsMulti extends boolean, L extends ReactNode = ReactNode>(
  base: SelectClassNames<T, IsMulti, L>,
  overrides: SelectClassNames<T, IsMulti, L> = {},
): SelectClassNames<T, IsMulti, L> {
  const keys = new Set([...Object.keys(base), ...Object.keys(overrides)]) as Set<keyof SelectClassNames<T, IsMulti, L>>;
  const merged: Record<string, (state: unknown) => string> = {};

  keys.forEach((key) => {
    const baseClass = base[key] as ((state: unknown) => string) | undefined;
    const overrideClass = overrides[key] as ((state: unknown) => string) | undefined;

    merged[key] = (state) => twMerge(baseClass?.(state), overrideClass?.(state));
  });

  return merged as SelectClassNames<T, IsMulti, L>;
}
