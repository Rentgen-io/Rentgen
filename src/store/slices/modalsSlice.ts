import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PostmanCollection } from 'shared/types/postman';
import { IntegrityStatus, ProjectData, ProjectMeta } from 'shared/types/project';
import { ImportConflictSummary } from 'src/utils/collection';

export type SettingsTab = 'testEngine' | 'general' | 'ai' | 'themes' | 'language' | 'cli';

export interface ImportConflictModalState {
  isOpen: boolean;
  importedCollection: PostmanCollection | null;
  conflictSummary: ImportConflictSummary | null;
}

export interface SetAsDynamicVariableModalState {
  isOpen: boolean;
  initialSelector: string;
  initialValue: string;
  requestId: string;
  collectionName: string;
  requestName: string;
  source: 'body' | 'header';
}

export interface ProjectImportConfirmModalState {
  isOpen: boolean;
  data: ProjectData | null;
  meta: ProjectMeta | null;
  integrityStatus: IntegrityStatus | null;
  fileName: string;
}

interface ModalsState {
  deleteFolderModal: {
    id: string | null;
    isOpen: boolean;
    name: string | null;
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
    activeTab: SettingsTab;
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
};

const emptyProjectImportConfirmModal: ProjectImportConfirmModalState = {
  data: null,
  fileName: '',
  integrityStatus: null,
  isOpen: false,
  meta: null,
};

const initialState: ModalsState = {
  deleteFolderModal: {
    id: null,
    isOpen: false,
    name: null,
  },
  importConflictModal: emptyImportConflictModal,
  openFollowModal: false,
  openImportResourceModal: false,
  openGitHubModal: false,
  openReloadModal: false,
  openSendHttpSuccessModal: false,
  projectImportConfirmModal: emptyProjectImportConfirmModal,
  setAsDynamicVariableModal: emptySetAsDynamicVariableModal,
  settingsModal: { isOpen: false, activeTab: 'testEngine' },
};

export const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    closeDeleteFolderModal: (state) => {
      state.deleteFolderModal = {
        id: null,
        isOpen: false,
        name: null,
      };
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
      state.settingsModal = { activeTab: 'testEngine', isOpen: false };
    },
    openDeleteFolderModal: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.deleteFolderModal = {
        id: action.payload.id,
        isOpen: true,
        name: action.payload.name,
      };
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
      }>,
    ) => {
      state.importConflictModal = {
        conflictSummary: action.payload.conflictSummary,
        importedCollection: action.payload.collection,
        isOpen: true,
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
      state.openSendHttpSuccessModal = true;
    },
    openSetAsDynamicVariableModal: (state, action: PayloadAction<Omit<SetAsDynamicVariableModalState, 'isOpen'>>) => {
      state.setAsDynamicVariableModal = { ...action.payload, isOpen: true };
    },
    openSettingsModal: (state, action: PayloadAction<SettingsTab | undefined>) => {
      state.settingsModal = { activeTab: action.payload ?? 'testEngine', isOpen: true };
    },
  },
});

export const modalsActions = modalsSlice.actions;
export default modalsSlice.reducer;
