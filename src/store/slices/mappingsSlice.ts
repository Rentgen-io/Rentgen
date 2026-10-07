import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { defaultMappings } from 'shared/defaults';
import { loadMappings as loadMappingsFile } from 'src/api/storage';
import { MappingsState, RequestParameters } from 'src/types';

export const initialState: MappingsState = defaultMappings;

export const loadMappings = createAsyncThunk('mappings/load', async () => await loadMappingsFile());

export const mappingsSlice = createSlice({
  name: 'mappings',
  initialState,
  reducers: {
    setBodyMappings: (state, action: PayloadAction<{ requestId: string; mappings: RequestParameters }>) => {
      const { requestId, mappings } = action.payload;
      if (!state[requestId]) state[requestId] = { body: {}, query: {} };

      state[requestId].body = mappings;
    },
    setQueryMappings: (state, action: PayloadAction<{ requestId: string; mappings: RequestParameters }>) => {
      const { requestId, mappings } = action.payload;
      if (!state[requestId]) state[requestId] = { body: {}, query: {} };

      state[requestId].query = mappings;
    },
    removeMappings: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
    replaceMappings: (_, action: PayloadAction<MappingsState>) => ({
      ...initialState,
      ...action.payload,
    }),
  },
  extraReducers: (builder) => {
    builder.addCase(loadMappings.fulfilled, (state, action: PayloadAction<MappingsState>) => {
      Object.assign(state, action.payload);
    });
  },
});

export const mappingsActions = mappingsSlice.actions;
export default mappingsSlice.reducer;
