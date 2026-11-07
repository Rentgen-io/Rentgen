import cn from 'classnames';
import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  label: string;
}

export default function SidebarButton({ active, children, className, label, onClick, ...otherProps }: Props) {
  return (
    <div
      className={twMerge(
        cn(
          'relative flex flex-col items-center justify-center gap-1 min-h-15.5 py-3 px-1 text-center box-border cursor-pointer',
          'hover:bg-muted',
          {
            'bg-muted before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-xs before:bg-primary':
              active,
          },
          className,
        ),
      )}
      onClick={onClick}
      {...otherProps}
    >
      {children}
      <span className="text-xs">{label}</span>
    </div>
  );
}
