import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Method } from 'axios';
import { PostmanBodyMode, RequestParameters, PostmanFormDataItem } from 'src/types';

export type BodyMode = PostmanBodyMode | 'none';
export type Mode = 'HTTP' | 'WSS';

interface RequestState {
  body: string;
  bodyMode: BodyMode;
  bodyParameters: RequestParameters;
  formData: PostmanFormDataItem[];
  headers: string;
  isSending: boolean;
  method: Method;
  mode: Mode;
  queryParameters: RequestParameters;
  url: string;
}

const initialState: RequestState = {
  body: '',
  bodyMode: 'none',
  bodyParameters: {},
  formData: [],
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
      state.body = '';
      state.bodyMode = 'none';
      state.bodyParameters = {};
      state.formData = [];
      state.headers = '';
      state.method = 'GET';
      state.queryParameters = {};
      state.url = '';
    },
    setBody: (state, action: PayloadAction<string>) => {
      state.body = action.payload;
    },
    setBodyMode: (state, action: PayloadAction<BodyMode>) => {
      state.bodyMode = action.payload;

      if (!state.body && state.bodyMode === 'raw') state.body = '{}';
    },
    setBodyParameters: (state, action: PayloadAction<RequestParameters>) => {
      state.bodyParameters = action.payload;
    },
    setFormData: (state, action: PayloadAction<PostmanFormDataItem[]>) => {
      state.formData = action.payload;
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
