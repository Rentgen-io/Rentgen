import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { selectSelectedRequestId } from './collectionSelectors';

export const selectRunningFolderId = (state: RootState) => state.collectionRun.runningFolderId;
export const selectRunningRequestId = (state: RootState) => state.collectionRun.runningRequestId;
export const selectCollectionRunResults = (state: RootState) => state.collectionRun.results;
export const selectSelectedRequestRunResult = createSelector(
  [selectCollectionRunResults, selectSelectedRequestId],
  (results, selectedRequestId) => (selectedRequestId && results[selectedRequestId]) || null,
);
