import { RootState } from 'src/store';
import { createSelector } from '@reduxjs/toolkit';
import { selectUrl, selectIsSending, selectMethod } from './requestSelectors';

export const selectCurrentRun = (state: RootState) => state.preEvaluation.currentRun;
export const selectIsRunning = (state: RootState) => state.preEvaluation.isRunning;
export const selectPreEvaluation = (state: RootState) => state.preEvaluation.preEvaluation;

export const selectPreEvaluationDisabled = createSelector(
  [selectIsSending, selectMethod, selectPreEvaluation, selectUrl],
  (isSending, method, preEvaluation, url) =>
    isSending || ['GET', 'HEAD'].includes(method) || !preEvaluation?.promptPath || !url,
);
