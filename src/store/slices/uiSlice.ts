import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TestingModeTab } from 'src/constants/testing-mode-tabs';
import { TestsTab } from 'src/constants/tests-tabs';
import { AiTab, ReportFormat, SidebarTab } from 'src/types';

interface UIState {
  aiActiveTab: AiTab;
  exportFormat: ReportFormat;
  showLicenseSettings: boolean;
  sidebarActiveTab: SidebarTab;
  testingModeActiveTab: TestingModeTab;
  testsActiveTab: TestsTab;
}

const initialState: UIState = {
  aiActiveTab: 'overview',
  exportFormat: 'json',
  showLicenseSettings: false,
  sidebarActiveTab: 'collections',
  testingModeActiveTab: 'apiTesting',
  testsActiveTab: 'security',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAiActiveTab: (state, action: PayloadAction<AiTab>) => {
      state.aiActiveTab = action.payload;
    },
    setExportFormat: (state, action: PayloadAction<ReportFormat>) => {
      state.exportFormat = action.payload;
    },
    setShowLicenseSettings: (state, action: PayloadAction<boolean>) => {
      state.showLicenseSettings = action.payload;
    },
    setSidebarActiveTab: (state, action: PayloadAction<SidebarTab>) => {
      state.sidebarActiveTab = action.payload;
    },
    setTestingModeActiveTab: (state, action: PayloadAction<TestingModeTab>) => {
      state.testingModeActiveTab = action.payload;
    },
    setTestsActiveTab: (state, action: PayloadAction<TestsTab>) => {
      state.testsActiveTab = action.payload;
    },
    toggleSidebarTab: (state, action: PayloadAction<SidebarTab>) => {
      state.sidebarActiveTab = state.sidebarActiveTab === action.payload ? null : action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
