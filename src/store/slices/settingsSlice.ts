import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import merge from 'deepmerge';
import { defaultSettings } from 'shared/defaults';
import { MEDIAN_RESPONSE_TIME_TEST_NAME, NETWORK_SHARE_TEST_NAME, PING_LATENCY_TEST_NAME } from 'shared/testNames';
import { loadSettings as loadSettingsFile } from 'src/api/storage';
import i18n from 'src/i18n';
import { HistoryRetention, Language, SettingsState } from 'src/types';

export const initialState: SettingsState = defaultSettings;

export const loadSettings = createAsyncThunk('settings/load', async () => await loadSettingsFile());

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSerialNumber: (state, action: PayloadAction<string>) => {
      state.ai.serialNumber = action.payload;
    },
    setHistoryEnabled: (state, action: PayloadAction<boolean>) => {
      state.general.history.enabled = action.payload;
    },
    setHistorySize: (state, action: PayloadAction<number>) => {
      state.general.history.size = Math.max(1, Math.min(10000, action.payload));
    },
    setHistoryRetention: (state, action: PayloadAction<HistoryRetention>) => {
      state.general.history.retention = action.payload;
    },
    setEmailDomain: (state, action: PayloadAction<string>) => {
      state.testEngine.configuration.email.domain = action.payload;
    },
    setRandomEmailLength: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.randomEmail.length = action.payload;
    },
    setRandomIntMin: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.randomInt.min = action.payload;
    },
    setRandomIntMax: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.randomInt.max = action.payload;
    },
    setRandomStringLength: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.randomString.length = action.payload;
    },
    setEnum: (state, action: PayloadAction<string>) => {
      state.testEngine.configuration.enum = action.payload;
    },
    setNumberMin: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.number.min = action.payload;
    },
    setNumberMax: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.number.max = action.payload;
    },
    setStringMinLength: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.string.minLength = action.payload;
    },
    setStringMaxLength: (state, action: PayloadAction<number>) => {
      state.testEngine.configuration.string.maxLength = action.payload;
    },
    toggleSecurityTest: (state, action: PayloadAction<string>) => {
      if (state.testEngine.securityTests.disabled.includes(action.payload))
        state.testEngine.securityTests.disabled = state.testEngine.securityTests.disabled.filter(
          (test) => test !== action.payload,
        );
      else state.testEngine.securityTests.disabled.push(action.payload);
    },
    togglePerformanceInsight: (state, action: PayloadAction<string>) => {
      if (state.testEngine.performanceInsights.disabled.includes(action.payload)) {
        if (
          action.payload !== NETWORK_SHARE_TEST_NAME ||
          (!state.testEngine.performanceInsights.disabled.includes(MEDIAN_RESPONSE_TIME_TEST_NAME) &&
            !state.testEngine.performanceInsights.disabled.includes(PING_LATENCY_TEST_NAME))
        )
          state.testEngine.performanceInsights.disabled = state.testEngine.performanceInsights.disabled.filter(
            (insight) => insight !== action.payload,
          );
      } else {
        state.testEngine.performanceInsights.disabled.push(action.payload);

        if (
          (action.payload === MEDIAN_RESPONSE_TIME_TEST_NAME || action.payload === PING_LATENCY_TEST_NAME) &&
          !state.testEngine.performanceInsights.disabled.includes(NETWORK_SHARE_TEST_NAME)
        )
          state.testEngine.performanceInsights.disabled.push(NETWORK_SHARE_TEST_NAME);
      }
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(state);
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      applyTheme(state);
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      i18n.changeLanguage(action.payload);
    },
    replaceSettings: (state, action: PayloadAction<SettingsState>) => {
      Object.assign(state, merge(initialState, action.payload));

      if (action.payload.language) i18n.changeLanguage(action.payload.language);
      applyTheme(state);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadSettings.fulfilled, (state, action: PayloadAction<SettingsState>) => {
      state.cli = action.payload.cli;
      state.general = merge(state.general, action.payload.general || {});
      state.ai = merge(state.ai, action.payload.ai || {});
      state.testEngine = merge(state.testEngine, action.payload.testEngine || {});
      state.theme = action.payload.theme;
      state.language = action.payload.language || 'en';

      if (action.payload.language) i18n.changeLanguage(action.payload.language);
      applyTheme(state);
    });
  },
});

function applyTheme(state: SettingsState) {
  if (state.theme === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.add('dark');
}

export const settingsActions = settingsSlice.actions;
export default settingsSlice.reducer;
