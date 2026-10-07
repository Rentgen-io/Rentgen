import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectSelectedRequestRunResult } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';

export function useRunResultSync() {
  const dispatch = useAppDispatch();
  const runResult = useAppSelector(selectSelectedRequestRunResult);

  useEffect(() => {
    if (!runResult?.response) return;

    dispatch(responseActions.setResponse(runResult.response));
    dispatch(requestActions.setBodyParameters(runResult.bodyParameters || {}));
    dispatch(requestActions.setQueryParameters(runResult.queryParameters || {}));
  }, [runResult, dispatch]);
}
