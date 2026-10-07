import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { collectionToGroupedSidebarData, findRequestWithFolder } from 'src/utils';

export const selectCollectionData = (state: RootState) => state.collection.data;
export const selectSelectedRequestId = (state: RootState) => state.collection.selectedRequestId;
export const selectSelectedFolderId = (state: RootState) => state.collection.selectedFolderId;
export const selectSidebarFolders = createSelector([selectCollectionData], (collection) =>
  collectionToGroupedSidebarData(collection),
);
export const selectSelectedRequestWithFolder = createSelector(
  [selectCollectionData, selectSelectedRequestId],
  (collection, selectedRequestId) => (selectedRequestId ? findRequestWithFolder(collection, selectedRequestId) : null),
);
