import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ImportConflictModalState,
  ImportConflictSummary,
  IntegrityStatus,
  PostmanCollection,
  ProjectData,
  ProjectImportConfirmModalState,
  ProjectMeta,
  SetAsDynamicVariableModalState,
} from 'src/types';

interface ModalsState {
  openCurlModal: boolean;
  openFollowModal: boolean;
  openGitHubModal: boolean;
  openReloadModal: boolean;
  openSendHttpSuccessModal: boolean;
  deleteFolderModal: {
    isOpen: boolean;
    folderId: string | null;
  };
  importConflictModal: ImportConflictModalState;
  setAsDynamicVariableModal: SetAsDynamicVariableModalState;
  settingsModal: {
    isOpen: boolean;
    activeTab: number;
  };
  projectImportConfirmModal: ProjectImportConfirmModalState;
  curl: string;
}

const emptySetAsDynamicVariableModal: SetAsDynamicVariableModalState = {
  isOpen: false,
  initialSelector: '',
  initialValue: '',
  collectionName: '',
  requestId: '',
  requestName: '',
  source: 'body',
};

const emptyImportConflictModal: ImportConflictModalState = {
  isOpen: false,
  importedCollection: null,
  conflictSummary: null,
  warnings: [],
};

const emptyProjectImportConfirmModal: ProjectImportConfirmModalState = {
  isOpen: false,
  data: null,
  meta: null,
  integrityStatus: null,
  fileName: '',
};

const initialState: ModalsState = {
  openCurlModal: false,
  openFollowModal: false,
  openGitHubModal: false,
  openReloadModal: false,
  openSendHttpSuccessModal: false,
  deleteFolderModal: { isOpen: false, folderId: null },
  importConflictModal: emptyImportConflictModal,
  setAsDynamicVariableModal: emptySetAsDynamicVariableModal,
  projectImportConfirmModal: emptyProjectImportConfirmModal,
  settingsModal: { isOpen: false, activeTab: 0 },
  curl: '',
};

export const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    openCurlModal: (state) => {
      state.openCurlModal = true;
    },
    closeCurlModal: (state) => {
      state.openCurlModal = false;
      state.curl = '';
    },
    setCurl: (state, action: PayloadAction<string>) => {
      state.curl = action.payload;
    },
    openFollowModal: (state) => {
      if (!state.openGitHubModal) state.openFollowModal = true;
    },
    closeFollowModal: (state) => {
      state.openFollowModal = false;
    },
    openGitHubModal: (state) => {
      if (!state.openFollowModal) state.openGitHubModal = true;
    },
    closeGitHubModal: (state) => {
      state.openGitHubModal = false;
    },
    openReloadModal: (state) => {
      state.openReloadModal = true;
    },
    closeReloadModal: (state) => {
      state.openReloadModal = false;
    },
    openSendHttpSuccessModal: (state) => {
      const stored = localStorage.getItem('sendHttpSuccessModalDoNotShowAgain');
      state.openSendHttpSuccessModal = stored === null ? true : stored !== 'true';
    },
    closeSendHttpSuccessModal: (state) => {
      state.openSendHttpSuccessModal = false;
    },
    openDeleteFolderModal: (state, action: PayloadAction<string>) => {
      state.deleteFolderModal = { isOpen: true, folderId: action.payload };
    },
    closeDeleteFolderModal: (state) => {
      state.deleteFolderModal = { isOpen: false, folderId: null };
    },
    openImportConflictModal: (
      state,
      action: PayloadAction<{
        collection: PostmanCollection;
        conflictSummary: ImportConflictSummary;
        warnings: string[];
      }>,
    ) => {
      state.importConflictModal = {
        isOpen: true,
        importedCollection: action.payload.collection,
        conflictSummary: action.payload.conflictSummary,
        warnings: action.payload.warnings,
      };
    },
    closeImportConflictModal: (state) => {
      state.importConflictModal = emptyImportConflictModal;
    },
    openSetAsDynamicVariableModal: (state, action: PayloadAction<Omit<SetAsDynamicVariableModalState, 'isOpen'>>) => {
      state.setAsDynamicVariableModal = { ...action.payload, isOpen: true };
    },
    closeSetAsDynamicVariableModal: (state) => {
      state.setAsDynamicVariableModal = emptySetAsDynamicVariableModal;
    },
    openProjectImportConfirmModal: (
      state,
      action: PayloadAction<{
        data: ProjectData;
        meta: ProjectMeta;
        integrityStatus: IntegrityStatus;
        fileName: string;
      }>,
    ) => {
      state.projectImportConfirmModal = { isOpen: true, ...action.payload };
    },
    closeProjectImportConfirmModal: (state) => {
      state.projectImportConfirmModal = emptyProjectImportConfirmModal;
    },
    openSettingsModal: (state, action: PayloadAction<number | undefined>) => {
      state.settingsModal = { isOpen: true, activeTab: action.payload ?? 0 };
    },
    closeSettingsModal: (state) => {
      state.settingsModal = { isOpen: false, activeTab: 0 };
    },
  },
});

export const modalsActions = modalsSlice.actions;
export default modalsSlice.reducer;
