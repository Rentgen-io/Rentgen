import { createSelector } from '@reduxjs/toolkit';
import { Environment, VariableSuggestion } from 'shared/types/environment';
import { RootState } from 'src/store';

export const selectDynamicVariables = (state: RootState) => state.environment.dynamicVariables;
export const selectEditingEnvironmentId = (state: RootState) => state.environment.editingEnvironmentId;
export const selectEnvironments = (state: RootState) => state.environment.environments;
export const selectEnvironmentToDelete = (state: RootState) => state.environment.environmentToDelete;
export const selectIsEditingEnvironment = (state: RootState) => state.environment.isEditing;
export const selectSelectedEnvironmentId = (state: RootState) => state.environment.selectedEnvironmentId;

export const selectEditingEnvironment = createSelector(
  [selectEnvironments, selectEditingEnvironmentId],
  (environments, editingId) => environments.find(({ id }) => id === editingId) || null,
);
export const selectSelectedEnvironment = createSelector(
  [selectEnvironments, selectSelectedEnvironmentId],
  (environments, selectedId) => environments.find((env) => env.id === selectedId) || null,
);
export const selectHighlightColor = createSelector(
  [selectSelectedEnvironment],
  (selectedEnvironment) => selectedEnvironment?.color,
);
export const selectVariableNames = createSelector(
  [selectSelectedEnvironment, selectDynamicVariables],
  (selectedEnvironment, dynamicVariables) => [
    ...(selectedEnvironment?.variables?.map(({ key }) => key) ?? []),
    ...dynamicVariables
      .filter(({ environmentId }) => environmentId === selectedEnvironment?.id || !environmentId)
      .map(({ key }) => key),
  ],
);

/** Variable names from all environments (and dynamic variables), deduplicated, for the {{ autocompletion */
export const selectVariableSuggestions = createSelector(
  [selectEnvironments, selectDynamicVariables, selectSelectedEnvironmentId],
  (environments, dynamicVariables, selectedId) => {
    const environmentsById = new Map(environments.map((environment) => [environment.id, environment]));
    const suggestions = new Map<string, VariableSuggestion>();

    const add = (rawKey: string, environment: Environment | null, isAvailable: boolean, isGlobal = false) => {
      const key = rawKey.trim();
      if (!key) return;

      let suggestion = suggestions.get(key);
      if (!suggestion)
        suggestions.set(key, (suggestion = { key, environments: [], isAvailable: false, isGlobal: false }));
      if (environment && !suggestion.environments.includes(environment)) suggestion.environments.push(environment);
      suggestion.isAvailable ||= isAvailable;
      suggestion.isGlobal ||= isGlobal;
    };

    environments.forEach((environment) =>
      environment.variables?.forEach(({ key }) => add(key, environment, environment.id === selectedId)),
    );
    // Same scoping as selectVariableNames: a dynamic variable without an environment applies to all of them
    dynamicVariables.forEach(({ key, environmentId }) =>
      add(
        key,
        environmentId ? (environmentsById.get(environmentId) ?? null) : null,
        !environmentId || environmentId === selectedId,
        !environmentId,
      ),
    );

    return [...suggestions.values()].sort((a, b) => a.key.localeCompare(b.key));
  },
);
