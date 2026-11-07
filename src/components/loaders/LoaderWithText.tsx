import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Loader from './Loader';

interface Props extends HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export default function LoaderWithText({ className, text, ...otherProps }: Props) {
  return (
    <div className={twMerge('w-full flex items-center gap-2 text-sm box-border', className)} {...otherProps}>
      <Loader />
      {text}
    </div>
  );
}
