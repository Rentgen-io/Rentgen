import { createSelector } from '@reduxjs/toolkit';
import { DEFAULT_PRE_EVALUATION } from 'src/constants/pre-evaluation';
import { RootState } from 'src/store';
import { findPromptPointers, getPreEvaluationError, parseJsonObject } from 'src/utils';
import { selectBody, selectIsSending, selectMethod, selectUrl } from './requestSelectors';

export const selectAllEvaluationReports = (state: RootState) => state.preEvaluation.reports;
export const selectCurrentRun = (state: RootState) => state.preEvaluation.currentRun;
export const selectEvaluationReport = (state: RootState) => state.preEvaluation.report;
export const selectIsPreEvaluationRunning = (state: RootState) => state.preEvaluation.isRunning;
export const selectPreEvaluation = (state: RootState) => state.preEvaluation.data;

export const selectPreEvaluationTotalRuns = createSelector([selectPreEvaluation], (preEvaluation) => {
  const { iterations, questions } = preEvaluation ?? DEFAULT_PRE_EVALUATION;
  return questions.length * iterations;
});
export const selectPromptPathOptions = createSelector([selectBody], (body) =>
  findPromptPointers(parseJsonObject(body.mode === 'raw' ? body.raw : '')).map((path) => ({
    label: path,
    value: path,
  })),
);
export const selectPreEvaluationError = createSelector(
  [selectBody, selectMethod, selectUrl, selectPreEvaluation, selectPromptPathOptions],
  (body, method, url, preEvaluation, promptPathOptions) =>
    getPreEvaluationError(
      { body, method, url },
      preEvaluation ?? DEFAULT_PRE_EVALUATION,
      promptPathOptions.map(({ value }) => value),
    ),
);
export const selectPreEvaluationDisabled = createSelector(
  [selectIsSending, selectPreEvaluationError],
  (isSending, preEvaluationError) => isSending || preEvaluationError !== null,
);
export const selectRequestEvaluationReport = (requestId: string) =>
  createSelector([selectAllEvaluationReports], (results) => results[requestId] || null);
