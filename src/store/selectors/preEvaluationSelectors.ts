import { RootState } from 'src/store';
import { createSelector } from '@reduxjs/toolkit';
import { selectUrl, selectIsSending, selectMethod } from './requestSelectors';

export const selectAllEvaluationReports = (state: RootState) => state.preEvaluation.reports;
export const selectCurrentRun = (state: RootState) => state.preEvaluation.currentRun;
export const selectEvaluationReport = (state: RootState) => state.preEvaluation.report;
export const selectIsRunning = (state: RootState) => state.preEvaluation.isRunning;
export const selectPreEvaluation = (state: RootState) => state.preEvaluation.data;

export const selectPreEvaluationDisabled = createSelector(
  [selectIsSending, selectMethod, selectPreEvaluation, selectUrl],
  (isSending, method, preEvaluation, url) =>
    isSending || ['GET', 'HEAD'].includes(method) || !preEvaluation?.promptPath || !url,
);
export const selectRequestEvaluationReport = (requestId: string) =>
  createSelector([selectAllEvaluationReports], (results) => results[requestId] || null);
