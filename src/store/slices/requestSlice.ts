import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Method } from 'axios';
import { RequestParameters } from '../../types';

type Mode = 'HTTP' | 'WSS';

interface RequestState {
  mode: Mode;
  method: Method;
  url: string;
  headers: string;
  body: string;
  bodyParameters: RequestParameters;
  queryParameters: RequestParameters;
}

const initialState: RequestState = {
  mode: 'HTTP',
  method: 'GET',
  url: '',
  headers: '',
  body: '{}',
  bodyParameters: {},
  queryParameters: {},
};

export const requestSlice = createSlice({
  name: 'request',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setMethod: (state, action: PayloadAction<Method>) => {
      state.method = action.payload;
    },
    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
    setHeaders: (state, action: PayloadAction<string>) => {
      state.headers = action.payload;
    },
    setBody: (state, action: PayloadAction<string>) => {
      state.body = action.payload;
    },
    setBodyParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.bodyParameters = action.payload;
    },
    setQueryParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.queryParameters = action.payload;
    },
    resetRequest: (state) => {
      state.method = 'GET';
      state.url = '';
      state.headers = '';
      state.body = '{}';
      state.bodyParameters = {};
      state.queryParameters = {};
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
  },
});

export const requestActions = requestSlice.actions;
export default requestSlice.reducer;
