import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectHistoryEntries } from 'src/store/selectors';
import { historyActions } from 'src/store/slices/historySlice';
import { HistoryEntry } from 'src/types';
import SideBarSearch from '../SidebarSearch';
import HistoryDateGroup from './HistoryDateGroup';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

interface DateGroup {
  /** Shown (translated) and searched */
  label: string;
  date: string;
  entries: HistoryEntry[];
}

export default function HistoryPanel() {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();

  const entries = useAppSelector(selectHistoryEntries);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const today = useStartOfToday();

  const allGroups = useMemo(
    () =>
      groupHistoryByDate(entries, today, i18n.language, {
        today: t('history.today'),
        yesterday: t('history.yesterday'),
      }),
    [entries, today, i18n.language, t],
  );
  const groups = useMemo(() => filterGroupsBySearch(allGroups, searchTerm), [allGroups, searchTerm]);

  return (
    <>
      <div className="h-9 shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border box-border">
        <span className="text-xs text-muted-foreground">{t('history.title')}</span>
        {entries.length > 0 && (
          <TrashIcon
            className="size-3 text-muted-foreground hover:text-red-600 cursor-pointer"
            onClick={() => dispatch(historyActions.clearHistory())}
            title={t('history.clearAll')}
          />
        )}
      </div>

      {entries.length > 0 && (
        <SideBarSearch value={searchTerm} onChange={setSearchTerm} placeholder={t('history.searchHistory')} />
      )}

      {groups.length > 0 ? (
        <div className="h-full overflow-x-hidden overflow-y-auto">
          {groups.map((group) => (
            <HistoryDateGroup key={group.date} label={group.label} entries={group.entries} searchTerm={searchTerm} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full p-4 text-xs text-muted-foreground">
          {searchTerm.trim().length > 0 ? t('history.noMatchingHistory') : t('history.noHistoryYet')}
        </div>
      )}
    </>
  );
}

/** The start of the current day; changes at midnight, so an open app moves "Today" to "Yesterday" by itself. */
function useStartOfToday(): number {
  const [today, setToday] = useState<number>(() => getStartOfDay(new Date()));

  useEffect(() => {
    const date = new Date(today);
    const nextMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const timeoutId = setTimeout(() => setToday(getStartOfDay(new Date())), nextMidnight - Date.now());

    return () => clearTimeout(timeoutId);
  }, [today]);

  return today;
}

function getStartOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Groups the entries by day, labeled "Today", "Yesterday" or the date, in the app's language (not the system's), so
 * the shown labels are also what search matches.
 */
function groupHistoryByDate(
  entries: HistoryEntry[],
  today: number,
  language: string,
  labels: { today: string; yesterday: string },
): DateGroup[] {
  const yesterday = getStartOfDay(new Date(today - 1));
  const groups = new Map<string, { label: string; entries: HistoryEntry[] }>();

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp);
    const entryDay = getStartOfDay(entryDate);

    const key = entryDay === today ? 'today' : entryDay === yesterday ? 'yesterday' : String(entryDay);
    const label =
      entryDay === today
        ? labels.today
        : entryDay === yesterday
          ? labels.yesterday
          : entryDate.toLocaleDateString(language, { month: 'long', day: 'numeric' });

    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { label, entries: [entry] });
  }

  return Array.from(groups.entries()).map(([date, { label, entries: groupEntries }]) => ({
    label,
    date,
    entries: groupEntries,
  }));
}

function filterGroupsBySearch(groups: DateGroup[], searchTerm: string): DateGroup[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return groups;

  return groups.reduce<DateGroup[]>((acc, group) => {
    if (group.label.toLowerCase().includes(term)) acc.push(group);
    else {
      const filtered = group.entries.filter(
        (entry) =>
          entry.url.toLowerCase().includes(term) ||
          entry.method.toLowerCase().includes(term) ||
          entry.headers.toLowerCase().includes(term),
      );
      if (filtered.length > 0) acc.push({ ...group, entries: filtered });
    }
    return acc;
  }, []);
}
