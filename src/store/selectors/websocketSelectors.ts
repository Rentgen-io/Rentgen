import { RootState } from 'src/store';

export const selectWssConnected = (state: RootState) => state.websocket.connected;
export const selectWssMessages = (state: RootState) => state.websocket.messages;
