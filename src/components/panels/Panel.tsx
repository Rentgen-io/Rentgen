import cn from 'classnames';
import { HTMLAttributes, ReactNode } from 'react';

export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
}

export default function Panel({ children, className, title, ...otherProps }: Props) {
  return (
    <div
      className={cn(
        'bg-white border border-border rounded-md overflow-hidden',
        'dark:bg-dark-input dark:border-dark-border',
        className,
      )}
      {...otherProps}
    >
      <h4 className="m-0 p-4">{title}</h4>
      {children}
    </div>
  );
}
