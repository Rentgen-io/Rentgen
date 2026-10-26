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
  deleteFolderModal: {
    folderId: string | null;
    isOpen: boolean;
  };
  importConflictModal: ImportConflictModalState;
  openFollowModal: boolean;
  openImportResourceModal: boolean;
  openGitHubModal: boolean;
  openReloadModal: boolean;
  openSendHttpSuccessModal: boolean;
  projectImportConfirmModal: ProjectImportConfirmModalState;
  setAsDynamicVariableModal: SetAsDynamicVariableModalState;
  settingsModal: {
    activeTab: number;
    isOpen: boolean;
  };
}

const emptySetAsDynamicVariableModal: SetAsDynamicVariableModalState = {
  collectionName: '',
  initialSelector: '',
  initialValue: '',
  isOpen: false,
  requestId: '',
  requestName: '',
  source: 'body',
};

const emptyImportConflictModal: ImportConflictModalState = {
  conflictSummary: null,
  importedCollection: null,
  isOpen: false,
  warnings: [],
};

const emptyProjectImportConfirmModal: ProjectImportConfirmModalState = {
  data: null,
  fileName: '',
  integrityStatus: null,
  isOpen: false,
  meta: null,
};

const initialState: ModalsState = {
  deleteFolderModal: { isOpen: false, folderId: null },
  importConflictModal: emptyImportConflictModal,
  openFollowModal: false,
  openImportResourceModal: false,
  openGitHubModal: false,
  openReloadModal: false,
  openSendHttpSuccessModal: false,
  projectImportConfirmModal: emptyProjectImportConfirmModal,
  setAsDynamicVariableModal: emptySetAsDynamicVariableModal,
  settingsModal: { isOpen: false, activeTab: 0 },
};

export const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    closeDeleteFolderModal: (state) => {
      state.deleteFolderModal = { folderId: null, isOpen: false };
    },
    closeFollowModal: (state) => {
      state.openFollowModal = false;
    },
    closeGitHubModal: (state) => {
      state.openGitHubModal = false;
    },
    closeImportConflictModal: (state) => {
      state.importConflictModal = emptyImportConflictModal;
    },
    closeImportResourceModal: (state) => {
      state.openImportResourceModal = false;
    },
    closeProjectImportConfirmModal: (state) => {
      state.projectImportConfirmModal = emptyProjectImportConfirmModal;
    },
    closeReloadModal: (state) => {
      state.openReloadModal = false;
    },
    closeSendHttpSuccessModal: (state) => {
      state.openSendHttpSuccessModal = false;
    },
    closeSetAsDynamicVariableModal: (state) => {
      state.setAsDynamicVariableModal = emptySetAsDynamicVariableModal;
    },
    closeSettingsModal: (state) => {
      state.settingsModal = { activeTab: 0, isOpen: false };
    },
    openDeleteFolderModal: (state, action: PayloadAction<string>) => {
      state.deleteFolderModal = { folderId: action.payload, isOpen: true };
    },
    openFollowModal: (state) => {
      if (!state.openGitHubModal) state.openFollowModal = true;
    },
    openImportResourceModal: (state) => {
      state.openImportResourceModal = true;
    },
    openGitHubModal: (state) => {
      if (!state.openFollowModal) state.openGitHubModal = true;
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
        conflictSummary: action.payload.conflictSummary,
        importedCollection: action.payload.collection,
        isOpen: true,
        warnings: action.payload.warnings,
      };
    },
    openProjectImportConfirmModal: (
      state,
      action: PayloadAction<{
        data: ProjectData;
        fileName: string;
        integrityStatus: IntegrityStatus;
        meta: ProjectMeta;
      }>,
    ) => {
      state.projectImportConfirmModal = { ...action.payload, isOpen: true };
    },
    openReloadModal: (state) => {
      state.openReloadModal = true;
    },
    openSendHttpSuccessModal: (state) => {
      const stored = localStorage.getItem('sendHttpSuccessModalDoNotShowAgain');
      state.openSendHttpSuccessModal = stored === null ? true : stored !== 'true';
    },
    openSetAsDynamicVariableModal: (state, action: PayloadAction<Omit<SetAsDynamicVariableModalState, 'isOpen'>>) => {
      state.setAsDynamicVariableModal = { ...action.payload, isOpen: true };
    },
    openSettingsModal: (state, action: PayloadAction<number | undefined>) => {
      state.settingsModal = { activeTab: action.payload ?? 0, isOpen: true };
    },
  },
});

export const modalsActions = modalsSlice.actions;
export default modalsSlice.reducer;
