import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { DEFAULT_PRE_EVALUATION } from 'src/constants/pre-evaluation';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
import {
  selectBody,
  selectDynamicVariables,
  selectHeaders,
  selectMethod,
  selectPreEvaluation,
  selectPreEvaluationError,
  selectPreEvaluationTotalRuns,
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
  parseJsonObject,
  setByJsonPointer,
  substituteRequestVariables,
} from 'src/utils';

let activeController: AbortController | null = null;

/**
 * Aborts and forgets the running pre-evaluation: it ends without a report (unlike stopPreEvaluation), for when the
 * request is being reset. Store-free, so it can be used without subscribing (see useReset).
 */
export function abortPreEvaluation() {
  activeController?.abort();
  activeController = null;
}

/**
 * The pre-evaluation actions only, without store subscriptions: the request and settings are read from the store when
 * it starts. Components select the state they show (settings, progress, report) themselves.
 */
const usePreEvaluation = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const executePreEvaluation = useCallback(async () => {
    const state = store.getState();
    const preEvaluation = selectPreEvaluation(state) ?? DEFAULT_PRE_EVALUATION;
    const method = selectMethod(state);
    const selectedRequestId = selectSelectedRequestId(state);
    const validationError = selectPreEvaluationError(state);

    if (validationError) throw new Error(t(validationError.key, validationError.values));

    const {
      url: substitutedUrl,
      headers: substitutedHeaders,
      body: substitutedBody,
    } = substituteRequestVariables(
      selectBody(state),
      selectSelectedEnvironment(state),
      selectDynamicVariables(state),
      selectHeaders(state),
      selectUrl(state),
    );

    if (!findPromptPointers(substitutedBody).includes(preEvaluation.promptPath))
      throw new Error(t('preEvaluation.selectUserPromptField'));

    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    const report: EvaluationReport = {
      startedAt: new Date().toISOString(),
      planned: selectPreEvaluationTotalRuns(state),
      results: [],
    };

    try {
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
              ? getByJsonPointer(parseJsonObject(responseBody), preEvaluation.responsePath)
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
      if (controller === activeController) {
        activeController = null;
        dispatch(preEvaluationActions.setIsRunning(false));
      }
    }
  }, [dispatch, t]);

  const stopPreEvaluation = useCallback(() => activeController?.abort(), []);

  return { executePreEvaluation, stopPreEvaluation };
};

export default usePreEvaluation;
