import cn from 'classnames';
import { HTMLAttributes, ReactNode, useState } from 'react';

export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  collapsible?: boolean;
}

export default function Panel({ children, className, title, collapsible = true, ...otherProps }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div
      className={cn(
        'bg-white border border-border overflow-hidden',
        'dark:bg-dark-input dark:border-dark-border',
        className,
      )}
      {...otherProps}
    >
      <div
        className={cn(collapsible && 'cursor-pointer')}
        onClick={() => collapsible && setIsOpen((prevIsOpen) => !prevIsOpen)}
      >
        {typeof title === 'string' ? <h5 className="m-0 py-3 px-4">{title}</h5> : title}
      </div>
      {isOpen && children}
    </div>
  );
}
