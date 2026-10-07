import { RootState } from 'src/store';

export const selectOpenCurlModal = (state: RootState) => state.modals.openCurlModal;
export const selectOpenFollowModal = (state: RootState) => state.modals.openFollowModal;
export const selectOpenGitHubModal = (state: RootState) => state.modals.openGitHubModal;
export const selectOpenReloadModal = (state: RootState) => state.modals.openReloadModal;
export const selectOpenSendHttpSuccessModal = (state: RootState) => state.modals.openSendHttpSuccessModal;
export const selectDeleteFolderModal = (state: RootState) => state.modals.deleteFolderModal;
export const selectImportConflictModal = (state: RootState) => state.modals.importConflictModal;
export const selectSetAsDynamicVariableModal = (state: RootState) => state.modals.setAsDynamicVariableModal;
export const selectSettingsModal = (state: RootState) => state.modals.settingsModal;
export const selectProjectImportConfirmModal = (state: RootState) => state.modals.projectImportConfirmModal;
export const selectCurl = (state: RootState) => state.modals.curl;
