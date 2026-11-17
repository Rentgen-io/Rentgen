import { RootState } from 'src/store';
import { selectIsEditingEnvironment } from './environmentSelectors';
import { selectCompareResponse, selectIsComparingTestResults } from './testsSelectors';

export type MainView = 'environment' | 'comparison' | 'request';

export const selectAiActiveTab = (state: RootState) => state.ui.aiActiveTab;
export const selectExportFormat = (state: RootState) => state.ui.exportFormat;
export const selectShowLicenseSettings = (state: RootState) => state.ui.showLicenseSettings;
export const selectSidebarActiveTab = (state: RootState) => state.ui.sidebarActiveTab;
export const selectTestingModeActiveTab = (state: RootState) => state.ui.testingModeActiveTab;
export const selectTestsActiveTab = (state: RootState) => state.ui.testsActiveTab;

export const selectMainView = (state: RootState): MainView => {
  if (selectIsEditingEnvironment(state)) return 'environment';
  if (selectIsComparingTestResults(state) && selectCompareResponse(state)) return 'comparison';
  return 'request';
};
