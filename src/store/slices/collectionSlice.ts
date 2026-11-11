import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_FOLDER_ID } from 'shared/utils/collection';
import { loadCollection as loadCollectionFile } from 'src/api/storage';
import i18n from 'src/i18n';
import { PostmanCollection, PostmanFolder, PreEvaluation } from 'src/types';
import {
  addFolderToCollection,
  addRequestToCollection,
  createEmptyCollection,
  generateFolderId,
  generateRequestId,
  moveRequestToFolder,
  removeFolderFromCollection,
  removeRequestFromCollection,
  renameFolderInCollection,
  renameRequestInCollection,
  reorderFolderInCollection,
  reorderRequestInCollection,
  uniqueFolderName,
  updateRequestInCollection,
} from 'src/utils';

export type ImportMode = 'replace' | 'merge' | 'copy';

interface CollectionState {
  data: PostmanCollection;
  error: string | null;
  loading: boolean;
  selectedRequestId: string | null;
  selectedFolderId: string;
}

const initialState: CollectionState = {
  data: createEmptyCollection(),
  error: null,
  loading: true,
  selectedRequestId: null,
  selectedFolderId: DEFAULT_FOLDER_ID,
};

export const loadCollection = createAsyncThunk('collection/load', async () => await loadCollectionFile());

export const collectionSlice = createSlice({
  name: 'collection',
  initialState,
  reducers: {
    addFolder: (state, action: PayloadAction<string>) => {
      state.data = addFolderToCollection(state.data, uniqueFolderName(state.data, action.payload));
    },
    addRequest: (
      state,
      action: PayloadAction<{
        body: string | null;
        folderId?: string;
        headers: Record<string, string>;
        method: string;
        preEvaluation: PreEvaluation | null;
        url: string;
      }>,
    ) => {
      const { body, folderId, headers, method, preEvaluation, url } = action.payload;
      const targetFolderId = folderId || state.selectedFolderId;

      state.data = addRequestToCollection(state.data, method, url, headers, body, preEvaluation, targetFolderId);

      // Auto-select the newly added request (it's at index 0 due to unshift in addRequestToCollection)
      const folder = state.data.item.find((f) => f.id === targetFolderId);
      if (folder && folder.item.length > 0) state.selectedRequestId = folder.item[0].id;
    },
    importCollection: (state, action: PayloadAction<{ collection: PostmanCollection; mode: ImportMode }>) => {
      const { collection, mode } = action.payload;

      if (mode === 'replace') {
        // Folders already replaced or added by this import, so duplicate names inside the imported file
        // don't overwrite each other
        const importedFolderIds = new Set<string>();

        // Replace only matching folders, keep non-matching ones
        for (const importedFolder of collection.item) {
          const existingFolderIndex = state.data.item.findIndex(
            (folder) => folder.name === importedFolder.name && !importedFolderIds.has(folder.id),
          );

          if (existingFolderIndex !== -1) {
            // Replace existing folder with imported one, but keep the folder ID and the IDs of matching
            // requests, so selection, mappings and dynamic variables stay linked to them
            const existingFolder = state.data.item[existingFolderIndex];
            const existingRequests = [...existingFolder.item];

            state.data.item[existingFolderIndex] = {
              ...importedFolder,
              id: existingFolder.id,
              item: importedFolder.item.map((request) => {
                const existingRequestIndex = existingRequests.findIndex(
                  (existingRequest) => existingRequest.id === request.id,
                );
                if (existingRequestIndex === -1) {
                  const id = generateRequestId();
                  return { ...request, id };
                }

                const existingRequest = existingRequests[existingRequestIndex];
                return { ...request, id: existingRequest.id, preEvaluation: existingRequest.preEvaluation };
              }),
            };

            importedFolderIds.add(existingFolder.id);
          } else {
            // Add new folder
            state.data.item.push({
              ...importedFolder,
              id: generateFolderId(),
              item: importedFolder.item.map((request) => ({
                ...request,
                id: generateRequestId(),
              })),
            });
          }
        }
      } else if (mode === 'copy')
        // Import as Copy: Generate new IDs and append "(copy)" to folder names
        for (const folder of collection.item) {
          const newFolder = {
            ...folder,
            id: generateFolderId(),
            name: uniqueFolderName(state.data, `${folder.name} (copy)`),
            item: folder.item.map((request) => ({
              ...request,
              id: generateRequestId(),
            })),
          };
          state.data.item.push(newFolder);
        }
      else
        // Merge with deduplication: add only non-duplicate requests
        for (const folder of collection.item) {
          const existingFolder = state.data.item.find((f) => f.name === folder.name);
          if (existingFolder) {
            const newRequests = [];

            // Add only non-duplicate requests
            for (const request of folder.item) {
              if (
                !existingFolder.item.some(
                  (existing) =>
                    (existing.request.url === request.request.url &&
                      existing.request.method === request.request.method) ||
                    existing.name === request.name,
                )
              )
                newRequests.push({
                  ...request,
                  id: generateRequestId(), // Generate new ID to avoid collisions
                });
            }
            existingFolder.item.push(...newRequests);
          } else
            // New folder - add with new IDs
            state.data.item.push({
              ...folder,
              id: generateFolderId(),
              item: folder.item.map((request) => ({
                ...request,
                id: generateRequestId(),
              })),
            });
        }

      // In replace mode the selected request may have been dropped
      dropMissingSelection(state);
    },
    importFolder: (state, action: PayloadAction<PostmanFolder>) => {
      state.data.item.unshift({
        id: generateFolderId(),
        name: uniqueFolderName(state.data, action.payload.name),
        item: action.payload.item.map((request) => ({ ...request, id: generateRequestId() })),
      });
    },
    moveRequest: (
      state,
      action: PayloadAction<{
        itemId: string;
        targetFolderId: string;
        targetIndex?: number;
      }>,
    ) => {
      const { itemId, targetFolderId, targetIndex } = action.payload;
      state.data = moveRequestToFolder(state.data, itemId, targetFolderId, targetIndex);
    },
    removeFolder: (state, action: PayloadAction<string>) => {
      state.data = removeFolderFromCollection(state.data, action.payload);
      dropMissingSelection(state);
    },
    removeRequest: (state, action: PayloadAction<string>) => {
      state.data = removeRequestFromCollection(state.data, action.payload);
      dropMissingSelection(state);
    },
    renameFolder: (state, action: PayloadAction<{ folderId: string; newName: string }>) => {
      const { folderId, newName } = action.payload;
      state.data = renameFolderInCollection(state.data, folderId, uniqueFolderName(state.data, newName, folderId));
    },
    renameRequest: (state, action: PayloadAction<{ requestId: string; newName: string }>) => {
      const { requestId, newName } = action.payload;
      state.data = renameRequestInCollection(state.data, requestId, newName);
    },
    reorderFolder: (state, action: PayloadAction<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = action.payload;
      state.data = reorderFolderInCollection(state.data, activeId, overId);
    },
    reorderRequest: (state, action: PayloadAction<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = action.payload;
      state.data = reorderRequestInCollection(state.data, activeId, overId);
    },
    selectFolder: (state, action: PayloadAction<string>) => {
      state.selectedFolderId = action.payload;
    },
    selectRequest: (state, action: PayloadAction<string | null>) => {
      state.selectedRequestId = action.payload;
    },
    setCollection: (state, action: PayloadAction<PostmanCollection>) => {
      state.data = action.payload;
      dropMissingSelection(state);
    },
    updatePreEvaluation: (state, action: PayloadAction<{ preEvaluation: PreEvaluation; requestId: string }>) => {
      const item = state.data.item
        .flatMap((folder) => folder.item ?? [])
        .find((item) => item.id === action.payload.requestId);
      if (item) item.preEvaluation = action.payload.preEvaluation;
    },
    updateRequest: (
      state,
      action: PayloadAction<{
        body: string | null;
        headers: Record<string, string>;
        method: string;
        preEvaluation: PreEvaluation | null;
        requestId: string;
        url: string;
      }>,
    ) => {
      const { body, headers, method, preEvaluation, requestId, url } = action.payload;
      state.data = updateRequestInCollection(state.data, requestId, method, url, headers, body, preEvaluation);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCollection.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.data = action.payload;

        const folderId = getDefaultFolderId(state.data);
        if (folderId) state.selectedFolderId = folderId;
      })
      .addCase(loadCollection.rejected, (state, action) => {
        state.error = action.error.message || i18n.t('collections.failedToLoadCollection');
        state.loading = false;
      });
  },
});

// Folder selected by default: the default folder, or the first one when it does not exist
function getDefaultFolderId(collection: PostmanCollection) {
  return (collection.item?.find(({ id }) => id === DEFAULT_FOLDER_ID) ?? collection.item?.[0])?.id;
}

// Reset selection pointing to a folder / request that is no longer in the collection
function dropMissingSelection(state: CollectionState) {
  const { data, selectedFolderId, selectedRequestId } = state;
  const folders = data.item;

  if (!folders.some(({ id }) => id === selectedFolderId))
    state.selectedFolderId = getDefaultFolderId(data) ?? DEFAULT_FOLDER_ID;

  if (selectedRequestId && !folders.some((folder) => folder.item.some(({ id }) => id === selectedRequestId)))
    state.selectedRequestId = null;
}

export const collectionActions = collectionSlice.actions;
export default collectionSlice.reducer;
