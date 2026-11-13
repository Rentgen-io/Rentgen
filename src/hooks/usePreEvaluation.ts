import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { DEFAULT_PRE_EVALUATION } from 'src/constants/pre-evaluation';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectCurrentRun,
  selectDynamicVariables,
  selectEvaluationReport,
  selectHeaders,
  selectIsRunning,
  selectMethod,
  selectPreEvaluation,
  selectSelectedEnvironment,
  selectSelectedRequestId,
  selectUrl,
} from 'src/store/selectors';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { EvaluationReport, EvaluationResult, HttpRequest } from 'src/types';
import {
  evaluate,
  extractStatusCode,
  findPromptPointers,
  getByJsonPointer,
  isFieldsBody,
  setByJsonPointer,
  substituteRequestVariables,
} from 'src/utils';

export const MAX_ITERATIONS = 1000;
export const MIN_ITERATIONS = 1;

let activeController: AbortController | null = null;

/** Aborts and forgets the running pre-evaluation. Store-free, so it can be used without subscribing (see useReset) */
export function abortPreEvaluation() {
  activeController?.abort();
  activeController = null;
}

const usePreEvaluation = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const body = useAppSelector(selectBody);
  const currentRun = useAppSelector(selectCurrentRun);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const evaluationReport = useAppSelector(selectEvaluationReport);
  const headers = useAppSelector(selectHeaders);
  const isRunningPreEvaluation = useAppSelector(selectIsRunning);
  const method = useAppSelector(selectMethod);
  const preEvaluation = useAppSelector(selectPreEvaluation) ?? DEFAULT_PRE_EVALUATION;
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const url = useAppSelector(selectUrl);
  const totalRuns = preEvaluation.questions.length * preEvaluation.iterations;

  const cancelPreEvaluation = useCallback(() => activeController?.abort(), []);

  const executePreEvaluation = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    const {
      url: substitutedUrl,
      headers: substitutedHeaders,
      body: substitutedBody,
    } = substituteRequestVariables(body, selectedEnvironment, dynamicVariables, headers, url);
    const report: EvaluationReport = {
      startedAt: new Date().toISOString(),
      planned: totalRuns,
      results: [],
    };

    try {
      if (!substitutedUrl || ['GET', 'HEAD'].includes(method.toUpperCase()) || isFieldsBody(substitutedBody))
        throw new Error(t('preEvaluation.useRequestMethodWithJsonBody'));

      if (!findPromptPointers(substitutedBody).includes(preEvaluation.promptPath))
        throw new Error(t('preEvaluation.selectUserPromptField'));

      if (
        !Number.isInteger(preEvaluation.iterations) ||
        preEvaluation.iterations < MIN_ITERATIONS ||
        preEvaluation.iterations > MAX_ITERATIONS
      )
        throw new Error(t('preEvaluation.iterationsMustBeBetween', { min: MIN_ITERATIONS, max: MAX_ITERATIONS }));

      if (
        !preEvaluation.questions.length ||
        preEvaluation.questions.some(
          (question) => !question.prompt.trim() || (!question.contains.length && !question.notContains.length),
        )
      )
        throw new Error(t('preEvaluation.everyQuestionNeedsPromptAndAssertion'));

      dispatch(preEvaluationActions.startPreEvaluation());

      for (const question of preEvaluation.questions) {
        for (let iteration = 1; iteration <= preEvaluation.iterations; iteration++) {
          if (controller.signal.aborted) break;

          const request: HttpRequest = {
            url: substitutedUrl,
            method,
            headers: substitutedHeaders,
            body: setByJsonPointer(substitutedBody, preEvaluation.promptPath, question.prompt),
          };
          const result: EvaluationResult = {
            iteration,
            prompt: question.prompt,
            questionId: question.id,
            reasons: [],
            request,
            response: null,
          };

          try {
            const response = await sendHttp(request, controller.signal);
            if (controller.signal.aborted) break;

            result.response = response;

            const statusCode = extractStatusCode(response);
            if (statusCode < RESPONSE_STATUS.OK || statusCode >= RESPONSE_STATUS.REDIRECT)
              result.reasons.push(t('preEvaluation.httpError', { statusCode }));

            const responseBody = response.body;
            const text = preEvaluation.responsePath
              ? getByJsonPointer(
                  typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody,
                  preEvaluation.responsePath,
                )
              : responseBody;
            if (preEvaluation.responsePath && typeof text !== 'string')
              result.reasons.push(t('preEvaluation.responseTextFieldMissing'));
            else
              result.reasons.push(
                ...evaluate(typeof text === 'string' ? text : (JSON.stringify(text) ?? ''), question),
              );
          } catch (error) {
            if (controller.signal.aborted) break;

            result.reasons.push(error instanceof Error ? error.message : String(error));
          }

          report.results.push(result);
          dispatch(preEvaluationActions.setCurrentRun(report.results.length));
        }

        if (controller.signal.aborted) break;
      }

      report.finishedAt = new Date().toISOString();

      if (controller === activeController) dispatch(preEvaluationActions.setEvaluationReport(report));
      if (selectedRequestId)
        dispatch(
          preEvaluationActions.setRequestEvaluationReport({
            report,
            requestId: selectedRequestId,
          }),
        );
    } finally {
      dispatch(preEvaluationActions.setIsRunning(false));
      activeController = null;
    }
  }, [
    body,
    dynamicVariables,
    headers,
    method,
    preEvaluation,
    selectedEnvironment,
    selectedRequestId,
    totalRuns,
    url,
    dispatch,
    t,
  ]);

  return {
    currentRun,
    evaluationReport,
    isRunningPreEvaluation,
    preEvaluation,
    totalRuns,
    cancelPreEvaluation,
    executePreEvaluation,
  };
};

export default usePreEvaluation;
