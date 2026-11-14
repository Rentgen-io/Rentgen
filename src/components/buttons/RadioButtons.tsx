import cn from 'classnames';
import { twMerge } from 'tailwind-merge';

export type RadioOption<T extends string> = { label: string; value: T; disabled?: boolean };

interface Props<T extends string> {
  className?: string;
  disabled?: boolean;
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange(value: T): void;
}

export function RadioButtons<T extends string>({ className, disabled, name, options, value, onChange }: Props<T>) {
  return (
    <div className={twMerge('flex flex-col sm:flex-row p-px rounded bg-background border border-border', className)}>
      {options.map((option) => {
        const optionChecked = value === option.value;
        const optionDisabled = disabled || option.disabled;

        return (
          <label
            key={option.value}
            className={cn(
              'flex-1 flex items-center justify-center py-1 px-2 font-segoe-ui text-xs font-medium text-center rounded truncate',
              {
                'bg-primary text-white': optionChecked,
                'text-foreground': !optionChecked,
                'opacity-50 cursor-not-allowed': optionDisabled,
                'cursor-pointer': !optionChecked && !optionDisabled,
              },
            )}
          >
            <input
              className="sr-only"
              disabled={optionDisabled}
              type="radio"
              name={name}
              value={option.value}
              checked={optionChecked}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
