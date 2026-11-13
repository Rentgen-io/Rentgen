import cn from 'classnames';
import { useEffect, useState } from 'react';
import { HistoryEntry } from 'src/types';
import HistoryItem from './HistoryItem';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';

interface Props {
  label: string;
  entries: HistoryEntry[];
  searchTerm?: string;
}

/** A day of history; its label comes translated (HistoryPanel). */
export default function HistoryDateGroup({ label, entries, searchTerm }: Props) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    const isSearching = Boolean(searchTerm?.trim());
    if (isSearching) setIsExpanded(isSearching);
  }, [searchTerm]);

  return (
    <>
      <div
        className="h-9 flex items-center gap-2 px-3 py-1.5 hover:bg-muted box-border cursor-pointer outline-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronIcon
          className={cn('size-4 text-muted-foreground', {
            'rotate-90': isExpanded,
          })}
        />
        <span className="flex-auto text-xs font-medium truncate">{label}</span>
        <span className="text-xs text-muted-foreground">{entries.length}</span>
      </div>
      {isExpanded && entries.map((entry) => <HistoryItem key={entry.id} entry={entry} searchTerm={searchTerm} />)}
    </>
  );
}
