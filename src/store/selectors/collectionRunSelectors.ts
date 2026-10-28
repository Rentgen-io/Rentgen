import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { selectSelectedRequestId } from './collectionSelectors';

export const selectCollectionRunResults = (state: RootState) => state.collectionRun.results;
export const selectRunningFolderId = (state: RootState) => state.collectionRun.runningFolderId;
export const selectRunningRequestIds = (state: RootState) => state.collectionRun.runningRequestIds;

export const selectIsRequestRunning = (requestId: string) =>
  createSelector([selectRunningRequestIds], (runningRequestIds) => runningRequestIds.includes(requestId));
export const selectSelectedRequestRunResult = createSelector(
  [selectCollectionRunResults, selectSelectedRequestId],
  (results, selectedRequestId) => (selectedRequestId && results[selectedRequestId]) || null,
);
