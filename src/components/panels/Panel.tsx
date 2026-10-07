import cn from 'classnames';
import { HTMLAttributes, ReactNode, useState } from 'react';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';

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
        className={cn(collapsible && 'relative cursor-pointer pl-10')}
        onClick={() => collapsible && setIsOpen((prevIsOpen) => !prevIsOpen)}
      >
        {collapsible && (
          <ChevronIcon
            className={cn('h-5 w-5 absolute left-2.5 top-1/2 transform -translate-y-1/2', {
              'rotate-90': isOpen,
            })}
          />
        )}
        {typeof title === 'string' ? <h5 className={cn('m-0 py-3 px-4', collapsible && 'pl-0')}>{title}</h5> : title}
      </div>
      {isOpen && children}
    </div>
  );
}
