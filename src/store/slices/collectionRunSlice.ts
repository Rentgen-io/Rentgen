import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ExtractionFailure } from 'shared/types/environment';
import { HttpResponse, ResponseWarning } from 'shared/types/http';
import { RequestParameters } from 'shared/types/testing';

export interface CollectionRunResult {
  bodyParameters: RequestParameters | null;
  error: string | null;
  queryParameters: RequestParameters | null;
  response: HttpResponse | null;
  requestId: string;
  status: number | null;
  warnings: RunWarning[];
}

export type RunWarning =
  | { type: 'format'; warning: ResponseWarning }
  | { type: 'extraction'; failures: ExtractionFailure[] };

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
    finishFolderRun: (state, action: PayloadAction<string[]>) => {
      state.runningFolderId = null;
      state.runningRequestIds = state.runningRequestIds.filter((id) => !action.payload.includes(id));
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
