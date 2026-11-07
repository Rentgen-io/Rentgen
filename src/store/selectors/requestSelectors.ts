import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { selectIsRunningTests } from './testsSelectors';

export const selectBody = (state: RootState) => state.request.body;
export const selectBodyParameters = (state: RootState) => state.request.bodyParameters;
export const selectHeaders = (state: RootState) => state.request.headers;
export const selectIsSending = (state: RootState) => state.request.isSending;
export const selectMethod = (state: RootState) => state.request.method;
export const selectMode = (state: RootState) => state.request.mode;
export const selectPreEvaluation = (state: RootState) => state.request.preEvaluation;
export const selectQueryParameters = (state: RootState) => state.request.queryParameters;
export const selectUrl = (state: RootState) => state.request.url;
export const selectPreEvaluationDisabled = createSelector(
  [selectUrl, selectIsSending, selectMethod],
  (url, isSending, method) => !url || isSending || ['GET', 'HEAD'].includes(method),
);
export const selectIsRequestDisabled = createSelector(
  [selectUrl, selectIsRunningTests],
  (url, isRunningTests) => !url || isRunningTests,
);
