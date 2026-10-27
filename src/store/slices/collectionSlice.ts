import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_FOLDER_ID } from 'shared/utils/collection';
import { loadCollection as loadCollectionFile } from 'src/api/storage';
import { PostmanCollection, PostmanFolder } from 'src/types';
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
  selectedRequestId: string | null;
  selectedFolderId: string;
}

const initialState: CollectionState = {
  data: createEmptyCollection(),
  selectedRequestId: null,
  selectedFolderId: DEFAULT_FOLDER_ID,
};

export const loadCollection = createAsyncThunk('collection/load', async () => await loadCollectionFile());

export const collectionSlice = createSlice({
  name: 'collection',
  initialState,
  reducers: {
    addFolder: (state, action: PayloadAction<string>) => {
      state.data = addFolderToCollection(state.data, action.payload);
    },
    addRequest: (
      state,
      action: PayloadAction<{
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string | null;
        folderId?: string;
      }>,
    ) => {
      const { method, url, headers, body, folderId } = action.payload;
      const targetFolderId = folderId || state.selectedFolderId;
      state.data = addRequestToCollection(state.data, method, url, headers, body, targetFolderId);

      // Auto-select the newly added request (it's at index 0 due to unshift in addRequestToCollection)
      const folder = state.data.item.find((f) => f.id === targetFolderId);
      if (folder && folder.item.length > 0) state.selectedRequestId = folder.item[0].id;
    },
    importCollection: (state, action: PayloadAction<{ collection: PostmanCollection; mode: ImportMode }>) => {
      const { collection, mode } = action.payload;

      if (mode === 'replace')
        // Replace only matching folders, keep non-matching ones
        for (const importedFolder of collection.item) {
          const existingFolderIndex = state.data.item.findIndex((f) => f.name === importedFolder.name);

          if (existingFolderIndex !== -1)
            // Replace existing folder with imported one (new IDs)
            state.data.item[existingFolderIndex] = {
              ...importedFolder,
              id: generateFolderId(),
              item: importedFolder.item.map((request) => ({
                ...request,
                id: generateRequestId(),
              })),
            };
          else
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
      else if (mode === 'copy')
        // Import as Copy: Generate new IDs and append "(copy)" to folder names
        for (const folder of collection.item) {
          const newFolder = {
            ...folder,
            id: generateFolderId(),
            name: `${folder.name} (copy)`,
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
          if (existingFolder)
            // Add only non-duplicate requests
            for (const request of folder.item) {
              const isDuplicate = existingFolder.item.some(
                (existing) =>
                  // Duplicate by URL+Method
                  (existing.request.url === request.request.url &&
                    existing.request.method === request.request.method) ||
                  // Duplicate by name
                  existing.name === request.name,
              );
              if (!isDuplicate)
                existingFolder.item.push({
                  ...request,
                  id: generateRequestId(), // Generate new ID to avoid collisions
                });
            }
          else
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
    },
    removeRequest: (state, action: PayloadAction<string>) => {
      state.data = removeRequestFromCollection(state.data, action.payload);
      if (state.selectedRequestId === action.payload) state.selectedRequestId = null;
    },
    renameFolder: (state, action: PayloadAction<{ folderId: string; newName: string }>) => {
      const { folderId, newName } = action.payload;
      state.data = renameFolderInCollection(state.data, folderId, newName);
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
    },
    updateRequest: (
      state,
      action: PayloadAction<{
        requestId: string;
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string | null;
      }>,
    ) => {
      const { requestId, method, url, headers, body } = action.payload;
      state.data = updateRequestInCollection(state.data, requestId, method, url, headers, body);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadCollection.fulfilled, (state, action) => {
      state.data = action.payload;

      const folder = state.data.item?.find((f) => f.id === DEFAULT_FOLDER_ID) ?? state.data.item?.[0];
      if (folder) state.selectedFolderId = folder.id;
    });
  },
});

export const collectionActions = collectionSlice.actions;
export default collectionSlice.reducer;
