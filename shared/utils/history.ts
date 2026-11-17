import type { HistoryEntry } from 'shared/types/history';

/**
 * Whether a saved history entry has the current format. Entries saved before the headers became a table have them
 * as text: they're dropped (from the history file once, and from an imported project), not converted.
 */
export function isCurrentHistoryEntry(entry: unknown): entry is HistoryEntry {
  return typeof entry === 'object' && entry !== null && Array.isArray((entry as { headers?: unknown }).headers);
}
