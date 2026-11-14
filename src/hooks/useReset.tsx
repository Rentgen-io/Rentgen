import { useCallback } from 'react';
import { disconnectWebSocket } from 'src/api/network';
import { useAppDispatch } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { websocketActions } from 'src/store/slices/websocketSlice';
import { abortAllTestRuns, abortPreEvaluation } from 'src/test-engine';

export function useReset() {
  const dispatch = useAppDispatch();

  return useCallback(
    (clearSelection = true) => {
      abortAllTestRuns();
      dispatch(testsActions.resetTests());
      abortPreEvaluation();
      dispatch(preEvaluationActions.resetPreEvaluation());

      dispatch(requestActions.resetRequest());
      dispatch(responseActions.clearResponse());

      disconnectWebSocket();
      dispatch(websocketActions.clearMessages());
      dispatch(websocketActions.setConnected(false));

      if (clearSelection) dispatch(collectionActions.selectRequest(null));
    },
    [dispatch],
  );
}
