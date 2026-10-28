import { RootState } from 'src/store';

export const selectHistoryEntries = (state: RootState) => state.history.entries;
