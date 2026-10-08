import cn from 'classnames';

interface Props<T extends string> {
  className?: string;
  name: string;
  options: { label: string; value: T }[];
  value: T;
  onChange(value: T): void;
}

export function RadioButtons<T extends string>({ className, name, options, value, onChange }: Props<T>) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-px', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex-1 flex items-center justify-center py-2 px-3 font-segoe-ui text-xs font-bold text-center border cursor-pointer',
            {
              'bg-button-primary border-button-primary text-white': value === option.value,
              'bg-button-secondary border-button-secondary text-button-text-secondary': value !== option.value,
              'dark:bg-dark-button-secondary dark:border-dark-button-secondary dark:text-dark-text':
                value !== option.value,
            },
          )}
        >
          <input
            className="sr-only"
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
