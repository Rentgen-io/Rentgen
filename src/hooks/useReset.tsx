import { useCallback } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { websocketActions } from 'src/store/slices/websocketSlice';
import useTests from './useTests';

export function useReset() {
  const dispatch = useAppDispatch();
  const { cancelAllTests } = useTests();

  const reset = useCallback(
    (clearSelection = true) => {
      cancelAllTests();
      dispatch(requestActions.resetRequest());
      dispatch(responseActions.clearResponse());
      dispatch(websocketActions.clearMessages());
      dispatch(websocketActions.setConnected(false));

      if (clearSelection) dispatch(collectionActions.selectRequest(null));
    },
    [dispatch],
  );

  return reset;
}
