import cn from 'classnames';
import { InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export default function Toggle({
  className,
  disabled,
  label,
  title,
  ...otherProps
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label
      className={twMerge(
        cn('flex gap-4 items-center cursor-pointer', { 'opacity-50 cursor-not-allowed': disabled }, className),
      )}
    >
      {label}
      <span className="relative inline-flex items-center">
        <input disabled={disabled} className="sr-only peer" {...otherProps} type="checkbox" />
        <span
          className="w-7.5 h-3.5 border border-muted-foreground rounded-full
            peer-checked:bg-primary peer-checked:border-primary
            after:absolute after:top-0.5 after:left-0.5
            after:bg-muted-foreground after:h-3 after:w-3
            after:rounded-full
            after:transition-all after:duration-300
            peer-checked:after:translate-x-4
            peer-checked:after:bg-white"
          title={title}
        ></span>
      </span>
    </label>
  );
}
