import { RootState } from 'src/store';

export const selectExportFormat = (state: RootState) => state.ui.exportFormat;
export const selectSidebarActiveTab = (state: RootState) => state.ui.sidebarActiveTab;
