import { useCallback } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { requestActions } from 'src/store/slices/requestSlice';
import { isHttpUrl } from 'src/utils';
import { useReset } from './useReset';

export function useUrlImport() {
  const dispatch = useAppDispatch();
  const reset = useReset();

  return useCallback(
    (url: string): boolean => {
      if (!isHttpUrl(url)) return false;

      // `reset` already restores the GET method and empties headers and body
      reset();
      dispatch(requestActions.setUrl(url));

      return true;
    },
    [reset, dispatch],
  );
}
