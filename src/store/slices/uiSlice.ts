import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReportFormat, SidebarTab } from 'src/types';

interface UIState {
  sidebarActiveTab: SidebarTab;
  exportFormat: ReportFormat;

  // Transient "action succeeded" flags, cleared on a timer by the dispatching hook.
  saved: boolean;
  exported: boolean;
  certificated: boolean;
}

const initialState: UIState = {
  sidebarActiveTab: 'collections',
  exportFormat: 'json',
  saved: false,
  exported: false,
  certificated: false,
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
    setSaved: (state, action: PayloadAction<boolean>) => {
      state.saved = action.payload;
    },
    setExported: (state, action: PayloadAction<boolean>) => {
      state.exported = action.payload;
    },
    setCertificated: (state, action: PayloadAction<boolean>) => {
      state.certificated = action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
