import { configureStore } from '@reduxjs/toolkit';
import { listenerMiddleware } from './middleware/listenerMiddleware';
import collectionRunReducer from './slices/collectionRunSlice';
import collectionReducer from './slices/collectionSlice';
import environmentReducer from './slices/environmentSlice';
import historyReducer from './slices/historySlice';
import mappingsReducer from './slices/mappingsSlice';
import modalsReducer from './slices/modalsSlice';
import preEvaluationReducer from './slices/preEvaluationSlice';
import requestReducer from './slices/requestSlice';
import responseReducer from './slices/responseSlice';
import settingsReducer from './slices/settingsSlice';
import testsReducer from './slices/testsSlice';
import uiReducer from './slices/uiSlice';
import websocketReducer from './slices/websocketSlice';

export const store = configureStore({
  reducer: {
    collection: collectionReducer,
    collectionRun: collectionRunReducer,
    environment: environmentReducer,
    history: historyReducer,
    mappings: mappingsReducer,
    modals: modalsReducer,
    preEvaluation: preEvaluationReducer,
    request: requestReducer,
    response: responseReducer,
    settings: settingsReducer,
    tests: testsReducer,
    websocket: websocketReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
