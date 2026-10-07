import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';

export const selectEnvironments = (state: RootState) => state.environment.environments;
export const selectSelectedEnvironmentId = (state: RootState) => state.environment.selectedEnvironmentId;
export const selectIsEditingEnvironment = (state: RootState) => state.environment.isEditing;
export const selectEditingEnvironmentId = (state: RootState) => state.environment.editingEnvironmentId;
export const selectEnvironmentToDelete = (state: RootState) => state.environment.environmentToDelete;
export const selectSelectedEnvironment = createSelector(
  [selectEnvironments, selectSelectedEnvironmentId],
  (environments, selectedId) => environments.find((env) => env.id === selectedId) || null,
);

export const selectDynamicVariables = (state: RootState) => state.environment.dynamicVariables;

export const selectVariableNames = createSelector(
  [selectSelectedEnvironment, selectDynamicVariables],
  (selectedEnvironment, dynamicVariables) => [
    ...(selectedEnvironment?.variables?.map(({ key }) => key) ?? []),
    ...dynamicVariables
      .filter(({ environmentId }) => environmentId === selectedEnvironment?.id || !environmentId)
      .map(({ key }) => key),
  ],
);
