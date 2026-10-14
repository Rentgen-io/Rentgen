import cn from 'classnames';
import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends HTMLAttributes<HTMLDivElement> {
  text?: string;
  mode?: 'light' | 'dark';
}

export default function Loader({ className, mode = 'light', ...otherProps }: Props) {
  return (
    <div className={twMerge(cn('relative h-6 w-6 inline-block', className))} {...otherProps}>
      <span
        className={cn(
          'absolute top-0 left-0 right-0 bottom-0 border-4 border-b-button-primary rounded-full box-border animate-spin',
          mode === 'light' ? 'border-border' : 'border-white',
        )}
      ></span>
    </div>
  );
}
