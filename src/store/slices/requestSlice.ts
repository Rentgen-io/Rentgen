import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Method } from 'axios';
import { RequestParameters } from 'src/types';

export type Mode = 'HTTP' | 'WSS';

interface RequestState {
  body: string;
  bodyParameters: RequestParameters;
  headers: string;
  isSending: boolean;
  method: Method;
  mode: Mode;
  queryParameters: RequestParameters;
  url: string;
}

const initialState: RequestState = {
  body: '{}',
  bodyParameters: {},
  headers: '',
  isSending: false,
  method: 'GET',
  mode: 'HTTP',
  queryParameters: {},
  url: '',
};

export const requestSlice = createSlice({
  name: 'request',
  initialState,
  reducers: {
    importFromCurl: (
      state,
      action: PayloadAction<{
        url: string;
        method: string;
        headers: string;
        body: string;
      }>,
    ) => {
      const { url, method, headers, body } = action.payload;
      state.url = url;
      state.method = method as Method;
      state.headers = headers;
      state.body = body;
    },
    loadFromCollection: (
      state,
      action: PayloadAction<{
        method: string;
        url: string;
        headers: string;
        body: string;
      }>,
    ) => {
      const { method, url, headers, body } = action.payload;
      state.method = method as Method;
      state.url = url;
      state.headers = headers;
      state.body = body;
      state.bodyParameters = {};
      state.queryParameters = {};
    },
    resetRequest: (state) => {
      state.method = 'GET';
      state.url = '';
      state.headers = '';
      state.body = '{}';
      state.bodyParameters = {};
      state.queryParameters = {};
    },
    setBody: (state, action: PayloadAction<string>) => {
      state.body = action.payload;
    },
    setBodyParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.bodyParameters = action.payload;
    },
    setHeaders: (state, action: PayloadAction<string>) => {
      state.headers = action.payload;
    },
    setIsSending: (state, action: PayloadAction<boolean>) => {
      state.isSending = action.payload;
    },
    setMethod: (state, action: PayloadAction<Method>) => {
      state.method = action.payload;
    },
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setQueryParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.queryParameters = action.payload;
    },
    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
  },
});

export const requestActions = requestSlice.actions;
export default requestSlice.reducer;
