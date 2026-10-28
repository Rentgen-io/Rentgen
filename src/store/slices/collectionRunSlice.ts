import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HttpResponse, RequestParameters } from 'src/types';

export interface CollectionRunResult {
  bodyParameters: RequestParameters | null;
  error: string | null;
  queryParameters: RequestParameters | null;
  response: HttpResponse | null;
  requestId: string;
  status: number | null;
  warning?: string | null;
}

interface CollectionRunState {
  results: Record<string, CollectionRunResult>;
  runningFolderId: string | null;
  runningRequestIds: string[];
}

const initialState: CollectionRunState = {
  runningFolderId: null,
  runningRequestIds: [],
  results: {},
};

export const collectionRunSlice = createSlice({
  name: 'collectionRun',
  initialState,
  reducers: {
    addResult: (state, action: PayloadAction<CollectionRunResult>) => {
      state.results[action.payload.requestId] = action.payload;
    },
    clearFolderResults: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((requestId) => {
        delete state.results[requestId];
      });
    },
    finishFolderRun: (state) => {
      state.runningFolderId = null;
      state.runningRequestIds = [];
    },
    finishRequestRun: (state, action: PayloadAction<string>) => {
      state.runningRequestIds = state.runningRequestIds.filter((id) => id !== action.payload);
    },
    startRequestRun: (state, action: PayloadAction<string>) => {
      state.runningRequestIds.push(action.payload);
    },
    startFolderRun: (state, action: PayloadAction<{ folderId: string; totalRequests: number }>) => {
      state.runningFolderId = action.payload.folderId;
    },
  },
});

export const collectionRunActions = collectionRunSlice.actions;
export default collectionRunSlice.reducer;
