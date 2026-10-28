import cn from 'classnames';

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
    <div className={cn('flex flex-col sm:flex-row gap-px', className)}>
      {options.map((option) => {
        const optionChecked = value === option.value;
        const optionDisabled = disabled || option.disabled;

        return (
          <label
            key={option.value}
            className={cn(
              'flex-1 flex items-center justify-center py-2 px-3 font-segoe-ui text-xs font-bold text-center border',
              {
                'bg-button-primary border-button-primary text-white': optionChecked,
                'bg-button-secondary border-button-secondary text-button-text-secondary': !optionChecked,
                'dark:bg-dark-button-secondary dark:border-dark-button-secondary dark:text-dark-text': !optionChecked,
                'hover:bg-button-secondary-hover hover:border-button-secondary-hover hover:text-button-text-secondary-hover':
                  !optionChecked && !optionDisabled,
                'dark:hover:bg-dark-button-secondary-hover dark:hover:border-dark-button-secondary-hover dark:hover:text-dark-text':
                  !optionChecked && !optionDisabled,
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
