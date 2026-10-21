import { twMerge } from 'tailwind-merge';
import { AccordionItem, IAccordionItem } from './AccordionItem';
import { useState } from 'react';

interface Props {
  className?: string;
  items: IAccordionItem[];
}

export function Accordion({ className, items }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  if (items.length === 0) return null;

  return (
    <div className={twMerge('flex flex-col', className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          expanded={index === expandedIndex}
          onClick={() => {
            if (index === expandedIndex) setExpandedIndex(-1);
            else setExpandedIndex(index);
          }}
          {...item}
        />
      ))}
    </div>
  );
}
