import cn from 'classnames';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoryEntry } from 'src/types';
import HistoryItem from './HistoryItem';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';

interface Props {
  label: string;
  entries: HistoryEntry[];
  searchTerm?: string;
}

export default function HistoryDateGroup({ label, entries, searchTerm }: Props) {
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const displayLabel = label === 'today' ? t('history.today') : label === 'yesterday' ? t('history.yesterday') : label;

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
        <span className="flex-auto text-xs font-medium truncate">{displayLabel}</span>
        <span className="text-xs text-muted-foreground">{entries.length}</span>
      </div>
      {isExpanded && entries.map((entry) => <HistoryItem key={entry.id} entry={entry} searchTerm={searchTerm} />)}
    </>
  );
}
