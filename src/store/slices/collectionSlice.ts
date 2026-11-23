import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PostmanBody, PostmanCollection, PostmanFolder, PostmanHeader } from 'shared/types/postman';
import { PreEvaluation } from 'shared/types/pre-evaluation';
import { createEmptyCollection, DEFAULT_FOLDER_ID, uniqueFolderName } from 'shared/utils/collection';
import { generateFolderId } from 'shared/utils/id';
import { loadCollection as loadCollectionFile } from 'src/api/storage';
import i18n from 'src/i18n';
import {
  addFolderToCollection,
  addRequestToCollection,
  copyFolders,
  DropPosition,
  findFolderById,
  findRequestById,
  findRequestWithFolder,
  mergeCollections,
  moveNodeInCollection,
  removeFolderFromCollection,
  removeRequestFromCollection,
  renameFolderInCollection,
  renameRequestInCollection,
  replaceFolders,
  updateRequestInCollection,
  withNewIds,
} from 'src/utils/collection';

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
    // At the top of the collection, or as the last entry of `parentId`. The ID is generated when the action is created,
    // so the dispatcher knows the new folder (e.g. to start renaming it)
    addFolder: {
      reducer: (state, action: PayloadAction<{ id: string; name: string; parentId: string | null }>) => {
        const { id, name, parentId } = action.payload;
        state.data = addFolderToCollection(state.data, name, parentId, id);
      },
      prepare: ({ name, parentId = null }: { name: string; parentId?: string | null }) => ({
        payload: { id: generateFolderId(), name, parentId },
      }),
    },
    addRequest: (
      state,
      action: PayloadAction<{
        body: PostmanBody;
        folderId?: string;
        headers: PostmanHeader[];
        method: string;
        preEvaluation: PreEvaluation | null;
        url: string;
      }>,
    ) => {
      const { body, folderId, headers, method, preEvaluation, url } = action.payload;
      const targetFolderId = folderId || state.selectedFolderId;

      state.data = addRequestToCollection(state.data, method, url, headers, body, preEvaluation, targetFolderId);

      // Auto-select the newly added request (it's at index 0 due to unshift in addRequestToCollection)
      const folder = findFolderById(state.data, targetFolderId);
      if (folder && folder.item.length > 0) state.selectedRequestId = folder.item[0].id;
    },
    importCollection: (state, action: PayloadAction<{ collection: PostmanCollection; mode: ImportMode }>) => {
      const { collection, mode } = action.payload;

      if (mode === 'replace') state.data = replaceFolders(state.data, collection);
      else if (mode === 'copy') state.data = copyFolders(state.data, collection);
      else state.data = mergeCollections(state.data, collection);

      // In replace mode the selected request may have been dropped
      dropMissingSelection(state);
    },
    importFolder: (state, action: PayloadAction<PostmanFolder>) => {
      state.data.item.unshift({
        ...withNewIds(action.payload),
        name: uniqueFolderName(state.data.item, action.payload.name),
      });
    },
    // Moves a request / folder (with everything in it) to `position` of another one, e.g. on drag and drop.
    moveNode: (state, action: PayloadAction<{ nodeId: string; position: DropPosition; targetId: string }>) => {
      const { nodeId, position, targetId } = action.payload;
      state.data = moveNodeInCollection(state.data, nodeId, targetId, position);

      // Keep the selected request's folder selected when it is moved elsewhere
      if (nodeId === state.selectedRequestId) {
        const folderId = findFolderIdOfRequest(state.data, nodeId);
        if (folderId) state.selectedFolderId = folderId;
      }
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
      state.data = renameFolderInCollection(state.data, folderId, newName);
    },
    renameRequest: (state, action: PayloadAction<{ requestId: string; newName: string }>) => {
      const { requestId, newName } = action.payload;
      state.data = renameRequestInCollection(state.data, requestId, newName);
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
      // The request object inside the Immer draft, so it can be changed in place
      const item = findRequestById(state.data, action.payload.requestId);
      if (item) item.preEvaluation = action.payload.preEvaluation;
    },
    updateRequest: (
      state,
      action: PayloadAction<{
        body: PostmanBody;
        headers: PostmanHeader[];
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
  return (findFolderById(collection, DEFAULT_FOLDER_ID) ?? collection.item?.[0])?.id;
}

function findFolderIdOfRequest(collection: PostmanCollection, requestId: string) {
  return findRequestWithFolder(collection, requestId)?.folder.id;
}

// Reset selection pointing to a folder / request that is no longer in the collection. A missing folder
// falls back to the folder holding the selected request, then to the default folder
function dropMissingSelection(state: CollectionState) {
  const { data, selectedFolderId, selectedRequestId } = state;
  const requestFolderId = selectedRequestId ? findFolderIdOfRequest(data, selectedRequestId) : undefined;

  if (!requestFolderId) state.selectedRequestId = null;

  if (!findFolderById(data, selectedFolderId))
    state.selectedFolderId = requestFolderId ?? getDefaultFolderId(data) ?? DEFAULT_FOLDER_ID;
}

export const collectionActions = collectionSlice.actions;
export default collectionSlice.reducer;
