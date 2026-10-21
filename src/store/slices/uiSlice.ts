import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReportFormat, SidebarTab } from 'src/types';

interface UIState {
  aiActiveTab: number;
  exportFormat: ReportFormat;
  sidebarActiveTab: SidebarTab;
  testsActiveTab: number;
}

const initialState: UIState = {
  aiActiveTab: 0,
  exportFormat: 'json',
  sidebarActiveTab: 'collections',
  testsActiveTab: 0,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAiActiveTab: (state, action: PayloadAction<number>) => {
      state.aiActiveTab = action.payload;
    },
    setExportFormat: (state, action: PayloadAction<ReportFormat>) => {
      state.exportFormat = action.payload;
    },
    setSidebarActiveTab: (state, action: PayloadAction<SidebarTab>) => {
      state.sidebarActiveTab = action.payload;
    },
    setTestsActiveTab: (state, action: PayloadAction<number>) => {
      state.testsActiveTab = action.payload;
    },
    toggleSidebarTab: (state, action: PayloadAction<'collections' | 'environments' | 'history'>) => {
      state.sidebarActiveTab = state.sidebarActiveTab === action.payload ? null : action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
