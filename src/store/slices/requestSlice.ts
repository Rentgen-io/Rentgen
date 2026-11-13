import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Method } from 'axios';
import { PostmanBody, PostmanBodyMode, PostmanFormDataItem, PostmanUrlencodedItem, RequestParameters } from 'src/types';

export type Mode = 'HTTP' | 'WSS';

interface RequestState {
  body: PostmanBody;
  bodyParameters: RequestParameters;
  headers: string;
  isSending: boolean;
  method: Method;
  mode: Mode;
  queryParameters: RequestParameters;
  url: string;
}

const initialState: RequestState = {
  body: {},
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
    resetRequest: (state) => {
      state.body = {};
      state.bodyParameters = {};
      state.headers = '';
      state.method = 'GET';
      state.queryParameters = {};
      state.url = '';
    },
    setBody: (state, action: PayloadAction<PostmanBody>) => {
      state.body = action.payload;
    },
    setBodyFormData: (state, action: PayloadAction<PostmanFormDataItem[]>) => {
      state.body.formdata = action.payload;
    },
    setBodyMode: (state, action: PayloadAction<PostmanBodyMode | undefined>) => {
      state.body.mode = action.payload;

      if (state.body.mode === 'raw' && !state.body.raw) state.body.raw = '{}';
      else if (state.body.mode === 'formdata' && !state.body.formdata) state.body.formdata = [];
      else if (state.body.mode === 'urlencoded' && !state.body.urlencoded) state.body.urlencoded = [];
    },
    setBodyRaw: (state, action: PayloadAction<string>) => {
      state.body.raw = action.payload;
    },
    setBodyParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.bodyParameters = action.payload;
    },
    setBodyUrlencoded: (state, action: PayloadAction<PostmanUrlencodedItem[]>) => {
      state.body.urlencoded = action.payload;
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
    updateBodyParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.bodyParameters = action.payload;
    },
    updateQueryParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.queryParameters = action.payload;
    },
  },
});

export const requestActions = requestSlice.actions;
export default requestSlice.reducer;
