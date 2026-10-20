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
    addMessage: (state, action: PayloadAction<WssMessage>) => {
      state.messages.unshift(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    handleWssClose: (state, action: PayloadAction<string>) => {
      state.messages.unshift({ direction: 'system', data: `🔵 Disconnected from ${action.payload}` });
      state.connected = false;
    },
    handleWssError: (state, action: PayloadAction<string>) => {
      state.messages.unshift({ direction: 'system', data: `🔴 Error: ${action.payload}` });
    },
    handleWssMessage: (state, action: PayloadAction<{ data: string }>) => {
      state.messages.unshift({
        direction: 'received',
        data: action.payload.data,
      });
    },
    handleWssOpen: (state, action: PayloadAction<string>) => {
      state.messages = [{ direction: 'system', data: `🟢 Connected to ${action.payload}` }];
      state.connected = true;
    },
    handleWssSent: (state, action: PayloadAction<{ data: string }>) => {
      state.messages.unshift({
        direction: 'sent',
        data: action.payload.data,
      });
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    setMessages: (state, action: PayloadAction<WssMessage[]>) => {
      state.messages = action.payload;
    },
  },
});

export const websocketActions = websocketSlice.actions;
export default websocketSlice.reducer;
