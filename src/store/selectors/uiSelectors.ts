import { RootState } from 'src/store';

export const selectSidebarActiveTab = (state: RootState) => state.ui.sidebarActiveTab;
export const selectExportFormat = (state: RootState) => state.ui.exportFormat;
