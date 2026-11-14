import cn from 'classnames';
import { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export default function Input({
  className,
  disabled,
  type = 'text',
  ...otherProps
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={twMerge(
        cn(
          { 'opacity-50': disabled },
          'm-0 py-2 px-3 text-xs font-monospace text-foreground placeholder:text-muted-foreground bg-background border border-border rounded box-border outline-none',
          className,
        ),
      )}
      disabled={disabled}
      type={type}
      {...otherProps}
    />
  );
}
