import { RootState } from 'src/store';

export const selectSidebarActiveTab = (state: RootState) => state.ui.sidebarActiveTab;
export const selectExportFormat = (state: RootState) => state.ui.exportFormat;
export const selectSaved = (state: RootState) => state.ui.saved;
export const selectExported = (state: RootState) => state.ui.exported;
export const selectCertificated = (state: RootState) => state.ui.certificated;
export const selectCertificateError = (state: RootState) => state.ui.certificateError;
