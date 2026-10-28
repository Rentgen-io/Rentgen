import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  loadDynamicVariables as loadDynamicVariablesFile,
  loadEnvironments as loadEnvironmentsFile,
} from 'src/api/storage';
import { DynamicVariable, Environment, EnvironmentVariable } from 'src/types';
import { generateDynamicVariableId } from 'src/utils';

interface EnvironmentState {
  dynamicVariables: DynamicVariable[];
  editingEnvironmentId: string | null;
  environments: Environment[];
  environmentToDelete: string | null;
  isEditing: boolean;
  selectedEnvironmentId: string | null;
}

const initialState: EnvironmentState = {
  dynamicVariables: [],
  editingEnvironmentId: null,
  environments: [],
  environmentToDelete: null,
  isEditing: false,
  selectedEnvironmentId: null,
};

export const loadEnvironments = createAsyncThunk('environment/load', async () => await loadEnvironmentsFile());

export const loadDynamicVariables = createAsyncThunk(
  'environment/loadDynamicVariables',
  async () => await loadDynamicVariablesFile(),
);

export const environmentSlice = createSlice({
  name: 'environment',
  initialState,
  reducers: {
    addDynamicVariable: (state, action: PayloadAction<Omit<DynamicVariable, 'id' | 'lastUpdated'>>) => {
      state.dynamicVariables.push({
        ...action.payload,
        id: generateDynamicVariableId(),
        lastUpdated: Date.now(),
        previousRequests: [],
      });
    },
    addEnvironment: (state, action: PayloadAction<Environment>) => {
      state.environments.push(action.payload);
      state.selectedEnvironmentId = action.payload.id;
      state.editingEnvironmentId = action.payload.id;
    },
    addVariableToEnvironment: (
      state,
      action: PayloadAction<{ variable: EnvironmentVariable; environmentId: string | 'all' }>,
    ) => {
      const { variable, environmentId } = action.payload;

      const addOrUpdateVariable = (env: Environment) => {
        const existingIndex = env.variables.findIndex((v) => v.key === variable.key);
        if (existingIndex >= 0) env.variables[existingIndex] = variable;
        else env.variables.push(variable);
      };

      if (environmentId === 'all') state.environments.forEach(addOrUpdateVariable);
      else {
        const env = state.environments.find((e) => e.id === environmentId);
        if (env) addOrUpdateVariable(env);
      }
    },
    deleteEnvironment: (state, action: PayloadAction<string>) => {
      state.environments = state.environments.filter((e) => e.id !== action.payload);
      if (state.selectedEnvironmentId === action.payload) state.selectedEnvironmentId = null;
      if (state.editingEnvironmentId === action.payload) {
        state.isEditing = false;
        state.editingEnvironmentId = null;
      }

      state.environmentToDelete = null;
    },
    removeDynamicVariable: (state, action: PayloadAction<{ id: string }>) => {
      state.dynamicVariables = state.dynamicVariables.filter((v) => v.id !== action.payload.id);
    },
    reorderEnvironments: (state, action: PayloadAction<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = action.payload;
      const oldIndex = state.environments.findIndex((e) => e.id === activeId);
      const newIndex = state.environments.findIndex((e) => e.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const [moved] = state.environments.splice(oldIndex, 1);
        state.environments.splice(newIndex, 0, moved);
      }
    },
    replaceDynamicVariables: (state, action: PayloadAction<DynamicVariable[]>) => {
      state.dynamicVariables = action.payload;
    },
    selectEnvironment: (state, action: PayloadAction<string | null>) => {
      state.selectedEnvironmentId = action.payload;
    },
    setEnvironments: (state, action: PayloadAction<Environment[]>) => {
      state.environments = action.payload;
    },
    setEnvironmentToDelete: (state, action: PayloadAction<string | null>) => {
      state.environmentToDelete = action.payload;
    },
    startAddEnvironment: (state) => {
      state.selectedEnvironmentId = null;
      state.editingEnvironmentId = null;
      state.isEditing = true;
    },
    startEditing: (state, action: PayloadAction<string | null>) => {
      state.editingEnvironmentId = action.payload;
      state.isEditing = action.payload !== null;
    },
    stopEditing: (state) => {
      state.isEditing = false;
      state.editingEnvironmentId = null;
    },
    updateDynamicVariable: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Omit<DynamicVariable, 'id'>> }>,
    ) => {
      const { id, updates } = action.payload;
      const index = state.dynamicVariables.findIndex((v) => v.id === id);

      if (index >= 0) state.dynamicVariables[index] = { ...state.dynamicVariables[index], ...updates };
    },
    updateDynamicVariableValue: (state, action: PayloadAction<{ id: string; value: string }>) => {
      const { id, value } = action.payload;
      const variable = state.dynamicVariables.find((v) => v.id === id);

      if (variable) {
        variable.currentValue = value;
        variable.lastUpdated = Date.now();
      }
    },
    updateEnvironment: (state, action: PayloadAction<Environment>) => {
      const index = state.environments.findIndex((e) => e.id === action.payload.id);
      if (index >= 0) state.environments[index] = action.payload;
      else {
        state.environments.push(action.payload);
        state.selectedEnvironmentId = action.payload.id;
        state.editingEnvironmentId = action.payload.id;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEnvironments.fulfilled, (state, action) => {
        state.environments = action.payload;
      })
      .addCase(loadDynamicVariables.fulfilled, (state, action) => {
        state.dynamicVariables = action.payload || [];
      });
  },
});

export const environmentActions = environmentSlice.actions;
export default environmentSlice.reducer;
