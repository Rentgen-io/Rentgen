import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { selectIsRunningTests } from './testsSelectors';

export const selectBody = (state: RootState) => state.request.body;
export const selectBodyMode = (state: RootState) => state.request.bodyMode;
export const selectBodyParameters = (state: RootState) => state.request.bodyParameters;
export const selectFormData = (state: RootState) => state.request.formData;
export const selectHeaders = (state: RootState) => state.request.headers;
export const selectIsSending = (state: RootState) => state.request.isSending;
export const selectMethod = (state: RootState) => state.request.method;
export const selectMode = (state: RootState) => state.request.mode;
export const selectQueryParameters = (state: RootState) => state.request.queryParameters;
export const selectUrl = (state: RootState) => state.request.url;

export const selectIsRequestDisabled = createSelector(
  [selectUrl, selectIsRunningTests],
  (url, isRunningTests) => !url || isRunningTests,
);
