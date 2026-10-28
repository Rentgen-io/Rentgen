import { RootState } from 'src/store';

export const selectAiActiveTab = (state: RootState) => state.ui.aiActiveTab;
export const selectExportFormat = (state: RootState) => state.ui.exportFormat;
export const selectShowLicenseSettings = (state: RootState) => state.ui.showLicenseSettings;
export const selectSidebarActiveTab = (state: RootState) => state.ui.sidebarActiveTab;
export const selectTestsActiveTab = (state: RootState) => state.ui.testsActiveTab;
