import { RootState } from 'src/store';

export const selectTestEngineConfiguration = (state: RootState) => state.settings.testEngine.configuration;
export const selectDisabledSecurityTests = (state: RootState) => state.settings.testEngine.securityTests.disabled;
export const selectDisabledPerformanceInsights = (state: RootState) =>
  state.settings.testEngine.performanceInsights.disabled;

export const selectHistoryEnabled = (state: RootState) => state.settings.general.history.enabled;
export const selectHistorySize = (state: RootState) => state.settings.general.history.size;
export const selectHistoryRetention = (state: RootState) => state.settings.general.history.retention;

export const selectSerialNumber = (state: RootState) => state.settings.ai.serialNumber;
export const selectAiProviders = (state: RootState) => state.settings.ai.providers;
export const selectActiveAiProvider = (state: RootState) =>
  state.settings.ai.providers.find((provider) => provider.active);

export const selectLanguage = (state: RootState) => state.settings.language;

export const selectTheme = (state: RootState) => state.settings.theme;
