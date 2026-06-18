import { Action, Middleware, PayloadAction } from '@reduxjs/toolkit';
import { DynamicVariable, HttpResponse, PostmanFolder, PostmanItem, RequestParameters } from '../../types';
import { extractDynamicVariableFromResponseWithDetails } from '../../utils/dynamicVariable';
import { environmentActions } from '../slices/environmentSlice';
import { historyActions } from '../slices/historySlice';
import { mappingsActions } from '../slices/mappingsSlice';

// History actions that should NOT trigger auto-save (read-only or loading actions)
const historyReadOnlyActions = [
  'history/load/pending',
  'history/load/fulfilled',
  'history/load/rejected',
  'history/enforceRetention',
];

// Mappings actions that should NOT trigger auto-save (read-only or loading actions)
const mappingsReadOnlyActions = ['mappings/load/pending', 'mappings/load/fulfilled', 'mappings/load/rejected'];

// Settings actions that should NOT trigger auto-save (read-only or loading actions)
const settingsReadOnlyActions = ['settings/load/pending', 'settings/load/fulfilled', 'settings/load/rejected'];

// Actions that should NOT trigger auto-save (read-only or loading actions)
const collectionReadOnlyActions = [
  'collection/load/pending',
  'collection/load/fulfilled',
  'collection/load/rejected',
  'collection/selectRequest',
  'collection/selectFolder',
];

const environmentReadOnlyActions = [
  'environment/load/pending',
  'environment/load/fulfilled',
  'environment/load/rejected',
  'environment/loadDynamicVariables/pending',
  'environment/loadDynamicVariables/fulfilled',
  'environment/loadDynamicVariables/rejected',
  'environment/selectEnvironment',
  'environment/startEditing',
  'environment/stopEditing',
  'environment/startAddEnvironment',
  'environment/setEnvironmentToDelete',
  'environment/setDynamicVariables',
];

// Dynamic variable actions that should trigger auto-save of dynamic variables
const dynamicVariableActions = [
  'environment/addDynamicVariable',
  'environment/updateDynamicVariable',
  'environment/removeDynamicVariable',
  'environment/updateDynamicVariableValue',
  'environment/replaceDynamicVariables',
];

export const electronMiddleware: Middleware = (store) => (next) => (action) => {
  const actionType = (action as Action).type;

  // Gate history collection: skip adding entries when history is disabled
  if (actionType === 'history/addEntry') {
    const state = store.getState();
    if (!state.settings.general.history.enabled) return;
  }

  // When a folder is removed, also remove mappings for all requests within that folder
  if (actionType === 'collection/removeFolder') {
    const folderId = (action as PayloadAction<string>).payload;
    const folder = store.getState().collection.data.item.find((folder: PostmanFolder) => folder.id === folderId);

    folder?.item.forEach((item: PostmanItem) => store.dispatch(mappingsActions.removeMappings(item.id)));
  }

  const result = next(action);

  // Auto-save collection after mutation actions
  if (actionType && actionType.startsWith('collection/') && !collectionReadOnlyActions.includes(actionType)) {
    const state = store.getState();
    window.electronAPI.saveCollection(state.collection.data);

    // When a request is removed, also remove its mappings
    if (actionType === 'collection/removeRequest')
      store.dispatch(mappingsActions.removeMappings((action as PayloadAction<string>).payload));
  }

  // Auto-save environments after mutation actions (excluding dynamic variable actions)
  if (
    actionType &&
    actionType.startsWith('environment/') &&
    !environmentReadOnlyActions.includes(actionType) &&
    !dynamicVariableActions.includes(actionType)
  )
    window.electronAPI.saveEnvironments(store.getState().environment.environments);

  // Auto-save dynamic variables after their mutation actions
  if (actionType && dynamicVariableActions.includes(actionType))
    window.electronAPI.saveDynamicVariables(store.getState().environment.dynamicVariables);

  // Auto-save history after mutation actions
  if (actionType && actionType.startsWith('history/') && !historyReadOnlyActions.includes(actionType)) {
    // Enforce retention limits after history mutations
    const stateAfterHistory = store.getState();
    const { size, retention } = stateAfterHistory.settings.general.history;
    store.dispatch(historyActions.enforceRetention({ maxSize: size, retention }));

    const stateToSave = store.getState();
    window.electronAPI.saveHistory(stateToSave.history.entries);
  }

  // Auto-save mappings after mutation actions
  if (actionType && actionType.startsWith('mappings/') && !mappingsReadOnlyActions.includes(actionType))
    window.electronAPI.saveMappings(store.getState().mappings);

  // Auto-save settings after mutation actions
  if (actionType && actionType.startsWith('settings/') && !settingsReadOnlyActions.includes(actionType)) {
    const state = store.getState();
    window.electronAPI.saveSettings(state.settings);

    // Enforce retention when history size or retention settings change
    if (actionType === 'settings/setHistorySize' || actionType === 'settings/setHistoryRetention') {
      const { size, retention } = state.settings.general.history;
      store.dispatch(historyActions.enforceRetention({ maxSize: size, retention }));
      const updatedState = store.getState();
      window.electronAPI.saveHistory(updatedState.history.entries);
    }
  }

  // Auto-update dynamic variables when a response is received
  if (actionType === 'response/setResponse') {
    const state = store.getState();
    const currentRequestId = state.collection.selectedRequestId;

    if (currentRequestId) {
      const dynamicVars = (state.environment.dynamicVariables as DynamicVariable[]).filter(
        (dv) => dv.requestId === currentRequestId,
      );

      const response = (action as PayloadAction<HttpResponse>).payload;

      for (const dvar of dynamicVars) {
        const extractionResult = extractDynamicVariableFromResponseWithDetails(dvar, response);

        if (extractionResult.success && extractionResult.value !== null) {
          store.dispatch(
            environmentActions.updateDynamicVariableValue({
              id: dvar.id,
              value: extractionResult.value,
            }),
          );
        }
        // Note: Extraction failures are tracked in collectionRunResult.warning
      }
    }
  }

  // Auto-update mappings when body or query parameters are set for a request
  if (actionType === 'request/setBodyParameters' || actionType === 'request/setQueryParameters') {
    const parameters = (action as PayloadAction<RequestParameters>).payload;
    const selectedRequestId = store.getState().collection.selectedRequestId;

    if (selectedRequestId)
      if (actionType === 'request/setBodyParameters')
        store.dispatch(mappingsActions.setBodyMappings({ requestId: selectedRequestId, mappings: parameters }));
      else store.dispatch(mappingsActions.setQueryMappings({ requestId: selectedRequestId, mappings: parameters }));
  }

  return result;
};

export default electronMiddleware;
