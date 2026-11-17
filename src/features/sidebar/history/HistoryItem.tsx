import { Method } from 'axios';
import { memo, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import MethodBadge from 'src/components/badges/MethodBadge';
import SearchHighlighter from 'src/components/highlighters/SearchHighlighter';
import { useReset } from 'src/hooks/useReset';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
import { selectIsComparingTestResults } from 'src/store/selectors';
import { historyActions } from 'src/store/slices/historySlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { HistoryEntry } from 'src/types';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

interface Props {
  entry: HistoryEntry;
  searchTerm?: string;
}

/**
 * A history entry. Without store subscriptions and memoized: adding an entry (every sent request) doesn't re-render
 * the existing ones, which matters with up to thousands of entries.
 */
function HistoryItem({ entry, searchTerm }: Props) {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const reset = useReset();

  const time = new Date(entry.timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const displayUrl = (() => {
    try {
      const parsed = new URL(entry.url);
      return parsed.pathname + parsed.search;
    } catch {
      return entry.url;
    }
  })();

  const handleClick = () => {
    const isComparingTestResults = selectIsComparingTestResults(store.getState());

    reset();

    dispatch(requestActions.setMode(entry.url.startsWith('ws://') || entry.url.startsWith('wss://') ? 'WSS' : 'HTTP'));
    dispatch(requestActions.setMethod(entry.method as Method));
    dispatch(requestActions.setUrl(entry.url));
    dispatch(requestActions.setHeaders(entry.headers));
    dispatch(requestActions.setBody(entry.body));

    if (isComparingTestResults) dispatch(testsActions.clearResultsToCompare());
  };

  return (
    <div
      className="h-9 relative flex items-center gap-2 px-3 py-1.5 hover:bg-muted box-border group cursor-pointer outline-none"
      onClick={handleClick}
    >
      <MethodBadge method={entry.method} />
      <span className="flex-1 text-xs truncate" title={entry.url}>
        {searchTerm ? <SearchHighlighter text={displayUrl} term={searchTerm} /> : displayUrl}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">{time}</span>
      <div className="absolute top-0 bottom-0 right-0 px-3 flex items-center bg-muted opacity-0 group-hover:opacity-100">
        <TrashIcon
          className="size-3 text-muted-foreground hover:text-red-600 cursor-pointer"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            dispatch(historyActions.removeEntry(entry.id));
          }}
        />
      </div>
    </div>
  );
}

// Entries keep their object when others are added / removed: only new or changed rows render
export default memo(HistoryItem);
