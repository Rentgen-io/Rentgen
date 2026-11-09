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
  selectHeaders,
  selectIsRunning,
  selectMethod,
  selectPreEvaluation,
  selectSelectedEnvironment,
  selectUrl,
} from 'src/store/selectors';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { EvaluationResult, HttpRequest, PreEvaluation } from 'src/types';
import {
  evaluate,
  extractStatusCode,
  findPromptPointers,
  getByJsonPointer,
  isUrlEncodedContentType,
  setByJsonPointer,
  substituteRequestVariables,
} from 'src/utils';

export const MAX_ITERATIONS = 1000;
export const MIN_ITERATIONS = 1;

let activeController: AbortController | null = null;

const usePreEvaluation = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const body = useAppSelector(selectBody);
  const currentRun = useAppSelector(selectCurrentRun);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const headers = useAppSelector(selectHeaders);
  const isRunningPreEvaluation = useAppSelector(selectIsRunning);
  const method = useAppSelector(selectMethod);
  const preEvaluation = useAppSelector(selectPreEvaluation) ?? DEFAULT_PRE_EVALUATION;
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const url = useAppSelector(selectUrl);

  const totalRuns = preEvaluation.questions.length * preEvaluation.iterations;

  const cancelPreEvaluation = useCallback(() => {
    activeController?.abort();
    activeController = null;
  }, []);

  const executePreEvaluation = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    const {
      url: substitutedUrl,
      headers: substitutedHeaders,
      body: substitutedBody,
    } = substituteRequestVariables(url, headers, body, selectedEnvironment, dynamicVariables);
    const report: NonNullable<PreEvaluation['report']> = {
      startedAt: new Date().toISOString(),
      planned: totalRuns,
      results: [],
    };

    try {
      if (
        !substitutedUrl ||
        ['GET', 'HEAD'].includes(method.toUpperCase()) ||
        isUrlEncodedContentType(substitutedHeaders)
      )
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

      dispatch(preEvaluationActions.setIsRunning(true));
      dispatch(preEvaluationActions.setCurrentRun(0));

      for (const question of preEvaluation.questions) {
        for (let iteration = 1; iteration <= preEvaluation.iterations; iteration++) {
          if (controller.signal.aborted) break;

          const request: HttpRequest = {
            body: setByJsonPointer(substitutedBody, preEvaluation.promptPath, question.prompt),
            headers: substitutedHeaders,
            method,
            url: substitutedUrl,
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

      if (activeController === controller) dispatch(preEvaluationActions.setPreEvaluationReport(report));
    } finally {
      dispatch(preEvaluationActions.setIsRunning(false));
      activeController = null;
    }
  }, [body, dispatch, dynamicVariables, headers, method, preEvaluation, selectedEnvironment, totalRuns, url, t]);

  return {
    currentRun,
    isRunningPreEvaluation,
    preEvaluation,
    totalRuns,
    cancelPreEvaluation,
    executePreEvaluation,
  };
};

export default usePreEvaluation;
