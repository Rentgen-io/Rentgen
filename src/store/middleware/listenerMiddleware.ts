import { createListenerMiddleware, isAnyOf, isFulfilled } from '@reduxjs/toolkit';
import {
  saveCollection,
  saveDynamicVariables,
  saveEnvironments,
  saveHistory,
  saveMappings,
  saveSettings,
} from 'src/api/storage';
import type { AppDispatch, RootState } from 'src/store';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { collectionActions, loadCollection } from 'src/store/slices/collectionSlice';
import { environmentActions, loadDynamicVariables, loadEnvironments } from 'src/store/slices/environmentSlice';
import { historyActions, loadHistory } from 'src/store/slices/historySlice';
import { loadMappings, mappingsActions } from 'src/store/slices/mappingsSlice';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { loadSettings, settingsActions } from 'src/store/slices/settingsSlice';
import { collectExtractionFailures } from 'src/utils';

const isParametersUpdate = isAnyOf(requestActions.updateBodyParameters, requestActions.updateQueryParameters);

export const listenerMiddleware = createListenerMiddleware();
const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

// Data that was just loaded from disk must not be written straight back
const isHydration = isFulfilled(
  loadCollection,
  loadDynamicVariables,
  loadEnvironments,
  loadHistory,
  loadMappings,
  loadSettings,
);

/**
 * Saves a state branch whenever its reference changes.
 *
 * Immer only replaces references along the path that was actually modified, so this reacts to every
 * real mutation regardless of which action caused it, while UI-only actions (selection, editing flags, …)
 * leave the branch untouched and are ignored automatically — no action-type lists to maintain.
 *
 * The write is deferred by a single microtask, i.e. it runs right after the current (possibly nested)
 * dispatch chain finishes, so changes made by one dispatch (e.g. addEntry + enforceRetention, or removing
 * all mappings of a folder) are coalesced into a single write of the final state.
 */
const persist = <T>(select: (state: RootState) => T, save: (value: T) => void) =>
  startAppListening({
    predicate: (action, currentState, originalState) =>
      !isHydration(action) && select(currentState) !== select(originalState),
    effect: async (_, { cancelActiveListeners, getState, pause }) => {
      cancelActiveListeners();
      await pause(Promise.resolve());
      save(select(getState()));
    },
  });

persist((state) => state.collection.data, saveCollection);
persist((state) => state.environment.environments, saveEnvironments);
persist((state) => state.environment.dynamicVariables, saveDynamicVariables);
persist((state) => state.history.entries, saveHistory);
persist((state) => state.mappings, saveMappings);
persist((state) => state.settings, saveSettings);

// ---------------------------------------------------------------------------
// Side effects
// ---------------------------------------------------------------------------

// Removing a request removes its mappings
startAppListening({
  actionCreator: collectionActions.removeRequest,
  effect: ({ payload: requestId }, { dispatch }) => {
    dispatch(mappingsActions.removeMappings(requestId));
  },
});

// Removing a folder removes the mappings of every request it contained
startAppListening({
  actionCreator: collectionActions.removeFolder,
  effect: ({ payload: folderId }, { dispatch, getOriginalState }) => {
    getOriginalState()
      .collection.data.item.find((folder) => folder.id === folderId)
      ?.item.forEach((request) => dispatch(mappingsActions.removeMappings(request.id)));
  },
});

// Keep history within the configured size / retention limits
startAppListening({
  matcher: isAnyOf(
    historyActions.addEntry,
    historyActions.setEntries,
    settingsActions.setHistoryRetention,
    settingsActions.setHistorySize,
  ),
  effect: (_, { dispatch, getState }) => {
    const { size, retention } = getState().settings.general.history;
    dispatch(historyActions.enforceRetention({ maxSize: size, retention }));
  },
});

// Update dynamic variables extracted from the received response
startAppListening({
  actionCreator: responseActions.setResponse,
  effect: ({ payload: response }, { dispatch, getState }) => {
    const { collection, environment } = getState();
    if (!collection.selectedRequestId) return;

    collectExtractionFailures(
      environment.dynamicVariables,
      collection.selectedRequestId,
      response,
      (current, extracted) => {
        if (extracted.success && extracted.value !== null)
          dispatch(environmentActions.updateDynamicVariableValue({ id: current.id, value: extracted.value }));
      },
    );
  },
});

// Store body / query parameters as mappings and reflect them in the request's run result
startAppListening({
  matcher: isParametersUpdate,
  effect: (action, { dispatch, getState }) => {
    const parameters = action.payload;
    const requestId = getState().collection.selectedRequestId;

    if (!requestId || Object.keys(parameters).length === 0) return;

    const isBodyParameters = requestActions.updateBodyParameters.match(action);
    const setMappings = isBodyParameters ? mappingsActions.setBodyMappings : mappingsActions.setQueryMappings;

    dispatch(setMappings({ requestId, mappings: parameters }));

    const result = getState().collectionRun.results[requestId];
    if (result)
      dispatch(
        collectionRunActions.addResult({
          ...result,
          [isBodyParameters ? 'bodyParameters' : 'queryParameters']: parameters,
        }),
      );
  },
});

// Write pre-evaluation edits into the selected request of the collection (which then gets persisted)
startAppListening({
  matcher: isAnyOf(
    preEvaluationActions.addPreEvaluationQuestion,
    preEvaluationActions.removePreEvaluationQuestion,
    preEvaluationActions.setPreEvaluationQuestions,
    preEvaluationActions.updatePreEvaluation,
    preEvaluationActions.updatePreEvaluationQuestion,
  ),
  effect: (_, { dispatch, getState }) => {
    const { collection, preEvaluation } = getState();

    if (preEvaluation.data && collection.selectedRequestId)
      dispatch(
        collectionActions.updatePreEvaluation({
          preEvaluation: preEvaluation.data,
          requestId: collection.selectedRequestId,
        }),
      );
  },
});

export default listenerMiddleware;
