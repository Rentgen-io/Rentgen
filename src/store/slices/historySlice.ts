import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { parseHeaderText } from 'shared/utils/http';
import { loadHistory as loadHistoryFile } from 'src/api/storage';
import { HistoryEntry } from 'src/types';

interface HistoryState {
  entries: HistoryEntry[];
}

const initialState: HistoryState = {
  entries: [],
};

export const loadHistory = createAsyncThunk('history/load', async () => await loadHistoryFile());

export const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addEntry: (state, action: PayloadAction<HistoryEntry>) => {
      state.entries.unshift(action.payload);
    },
    clearHistory: (state) => {
      state.entries = [];
    },
    enforceRetention: (state, action: PayloadAction<{ maxSize: number; retention: string }>) => {
      const { maxSize, retention } = action.payload;
      const cutoff = getRetentionCutoff(retention);

      if (cutoff !== null) state.entries = state.entries.filter((entry) => entry.timestamp >= cutoff);
      if (state.entries.length > maxSize) state.entries = state.entries.slice(0, maxSize);
    },
    removeEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((entry) => entry.id !== action.payload);
    },
    setEntries: (state, action: PayloadAction<HistoryEntry[]>) => {
      state.entries = normalizeEntries(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadHistory.fulfilled, (state, action) => {
      state.entries = normalizeEntries(action.payload);
    });
  },
});

function getRetentionCutoff(retention: string): number | null {
  const now = Date.now();
  const durations: Record<string, number> = {
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
    '6m': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };
  if (retention === 'none' || !durations[retention]) return null;
  return now - durations[retention];
}

/**
 * Entries saved before the headers became a table have them as text (one `Name: value` per line): converted when
 * the history is loaded or imported with a project.
 */
function normalizeEntries(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.map((entry) => {
    const headers: unknown = entry.headers;
    return typeof headers === 'string' ? { ...entry, headers: parseHeaderText(headers) } : entry;
  });
}

export const historyActions = historySlice.actions;
export default historySlice.reducer;
