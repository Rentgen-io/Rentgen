import { RootState } from 'src/store';

export const selectTheme = (state: RootState) => state.settings.theme;
export const selectLanguage = (state: RootState) => state.settings.language;
export const selectHistoryEnabled = (state: RootState) => state.settings.general.history.enabled;
export const selectHistorySize = (state: RootState) => state.settings.general.history.size;
export const selectHistoryRetention = (state: RootState) => state.settings.general.history.retention;
export const selectTestEngineConfiguration = (state: RootState) => state.settings.testEngine.configuration;
export const selectDisabledSecurityTests = (state: RootState) => state.settings.testEngine.securityTests.disabled;
export const selectDisabledPerformanceInsights = (state: RootState) =>
  state.settings.testEngine.performanceInsights.disabled;
