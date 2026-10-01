import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WssMessage {
  direction: 'sent' | 'received' | 'system';
  data: string;
}

interface WebSocketState {
  connected: boolean;
  messages: WssMessage[];
}

const initialState: WebSocketState = {
  connected: false,
  messages: [],
};

export const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    addMessage: (state, action: PayloadAction<WssMessage>) => {
      state.messages.unshift(action.payload);
    },
    setMessages: (state, action: PayloadAction<WssMessage[]>) => {
      state.messages = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    handleWssOpen: (state, action: PayloadAction<string>) => {
      state.messages = [{ direction: 'system', data: `🟢 Connected to ${action.payload}` }];
      state.connected = true;
    },
    handleWssClose: (state, action: PayloadAction<string>) => {
      state.messages.unshift({ direction: 'system', data: `🔵 Disconnected from ${action.payload}` });
      state.connected = false;
    },
    handleWssMessage: (state, action: PayloadAction<{ data: string }>) => {
      state.messages.unshift({
        direction: 'received',
        data: action.payload.data,
      });
    },
    handleWssError: (state, action: PayloadAction<string>) => {
      state.messages.unshift({ direction: 'system', data: `🔴 Error: ${action.payload}` });
    },
    handleWssSent: (state, action: PayloadAction<{ data: string }>) => {
      state.messages.unshift({
        direction: 'sent',
        data: action.payload.data,
      });
    },
  },
});

export const websocketActions = websocketSlice.actions;
export default websocketSlice.reducer;
