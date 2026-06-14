import { configureStore } from '@reduxjs/toolkit';
import { electronMiddleware } from './middleware/electronMiddleware';
import collectionRunReducer from './slices/collectionRunSlice';
import collectionReducer from './slices/collectionSlice';
import environmentReducer from './slices/environmentSlice';
import historyReducer from './slices/historySlice';
import mappingsReducer from './slices/mappingsSlice';
import requestReducer from './slices/requestSlice';
import responseReducer from './slices/responseSlice';
import settingsReducer from './slices/settingsSlice';
import testReducer from './slices/testSlice';
import uiReducer from './slices/uiSlice';
import websocketReducer from './slices/websocketSlice';

export const store = configureStore({
  reducer: {
    collection: collectionReducer,
    collectionRun: collectionRunReducer,
    environment: environmentReducer,
    history: historyReducer,
    mappings: mappingsReducer,
    request: requestReducer,
    response: responseReducer,
    settings: settingsReducer,
    tests: testReducer,
    websocket: websocketReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore File objects in protoFile
        ignoredActions: ['request/setProtoFile'],
        ignoredPaths: ['request.protoFile'],
      },
    }).concat(electronMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
