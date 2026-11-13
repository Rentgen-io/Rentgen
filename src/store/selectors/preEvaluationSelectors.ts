import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { findPromptPointers, parseJsonObject } from 'src/utils';
import { selectBody, selectIsSending, selectMethod, selectUrl } from './requestSelectors';

export const selectAllEvaluationReports = (state: RootState) => state.preEvaluation.reports;
export const selectCurrentRun = (state: RootState) => state.preEvaluation.currentRun;
export const selectEvaluationReport = (state: RootState) => state.preEvaluation.report;
export const selectIsRunning = (state: RootState) => state.preEvaluation.isRunning;
export const selectPreEvaluation = (state: RootState) => state.preEvaluation.data;

export const selectPromptPathOptions = createSelector([selectBody], (body) =>
  findPromptPointers(parseJsonObject(body.mode === 'raw' ? body.raw : '')).map((path) => ({
    label: path,
    value: path,
  })),
);
export const selectPreEvaluationDisabled = createSelector(
  [selectIsSending, selectMethod, selectPreEvaluation, selectUrl, selectPromptPathOptions],
  (isSending, method, preEvaluation, url, promptPathOptions) =>
    isSending ||
    ['GET', 'HEAD'].includes(method) ||
    !preEvaluation?.promptPath ||
    !promptPathOptions.some((option) => option.value === preEvaluation.promptPath) ||
    !url,
);
export const selectRequestEvaluationReport = (requestId: string) =>
  createSelector([selectAllEvaluationReports], (results) => results[requestId] || null);
