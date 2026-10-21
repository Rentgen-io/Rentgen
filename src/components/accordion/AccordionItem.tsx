import cn from 'classnames';
import { KeyboardEvent, ReactNode, useId, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';

export interface IAccordionItem {
  title: ReactNode;
  content: ReactNode;
}

interface Props extends IAccordionItem {
  className?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onClick?(id?: number): void;
}

export function AccordionItem({ className, content, defaultExpanded = false, expanded, title, onClick }: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : internalExpanded;
  const contentId = useId();

  const handleClick = () => {
    if (!isControlled) setInternalExpanded((prevInternalExpanded) => !prevInternalExpanded);
    onClick?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={twMerge('flex flex-col', className)}>
      <div
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="relative pr-10 cursor-pointer"
        tabIndex={0}
        role="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {title}
        <ChevronIcon
          aria-hidden
          className={cn('h-5 w-5 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform', {
            'rotate-90': isExpanded,
          })}
        />
      </div>
      {isExpanded && <div id={contentId}>{content}</div>}
    </div>
  );
}
