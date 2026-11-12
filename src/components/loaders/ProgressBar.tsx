import { ProgressHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends Omit<ProgressHTMLAttributes<HTMLProgressElement>, 'value' | 'max'> {
  value: number;
  max: number;
}

export default function ProgressBar({ className, value, max, ...otherProps }: Props) {
  return (
    <progress
      className={twMerge(
        'block w-full h-0.75 border-0 rounded accent-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary',
        className,
      )}
      max={max}
      value={Math.min(value, max)}
      {...otherProps}
    />
  );
}
