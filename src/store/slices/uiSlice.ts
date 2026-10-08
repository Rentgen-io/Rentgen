import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReportFormat, SidebarTab } from 'src/types';

interface UIState {
  sidebarActiveTab: SidebarTab;
  exportFormat: ReportFormat;
}

const initialState: UIState = {
  sidebarActiveTab: 'collections',
  exportFormat: 'json',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarActiveTab: (state, action: PayloadAction<SidebarTab>) => {
      state.sidebarActiveTab = action.payload;
    },
    toggleSidebarTab: (state, action: PayloadAction<'collections' | 'environments' | 'history'>) => {
      state.sidebarActiveTab = state.sidebarActiveTab === action.payload ? null : action.payload;
    },
    setExportFormat: (state, action: PayloadAction<ReportFormat>) => {
      state.exportFormat = action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
