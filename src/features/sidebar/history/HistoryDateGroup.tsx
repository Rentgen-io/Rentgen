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
  const [isExpanded, setIsExpanded] = useState(true);
  const displayLabel = label === 'today' ? t('history.today') : label === 'yesterday' ? t('history.yesterday') : label;

  useEffect(() => {
    const isSearching = Boolean(searchTerm?.trim());
    if (isSearching) setIsExpanded(isSearching);
  }, [searchTerm]);

  return (
    <>
      <div
        className={cn(
          'h-9 flex items-center gap-2 px-3 py-1.5 border-b border-border dark:border-dark-input',
          'hover:bg-button-secondary dark:hover:bg-dark-input box-border cursor-pointer',
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronIcon
          className={cn('h-4 w-4 text-text-secondary', {
            'rotate-90': isExpanded,
          })}
        />
        <span className="text-xs font-bold truncate">{displayLabel}</span>
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{entries.length}</span>
      </div>

      {isExpanded && entries.map((entry) => <HistoryItem key={entry.id} entry={entry} searchTerm={searchTerm} />)}
    </>
  );
}
