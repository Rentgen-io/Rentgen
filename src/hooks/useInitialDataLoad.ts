import { useEffect } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { loadCollection } from 'src/store/slices/collectionSlice';
import { loadDynamicVariables, loadEnvironments } from 'src/store/slices/environmentSlice';
import { loadHistory } from 'src/store/slices/historySlice';
import { loadMappings } from 'src/store/slices/mappingsSlice';
import { loadSettings } from 'src/store/slices/settingsSlice';

export function useInitialDataLoad() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadCollection());
    dispatch(loadEnvironments());
    dispatch(loadDynamicVariables());
    dispatch(loadSettings());
    dispatch(loadMappings());
    dispatch(loadHistory());
  }, [dispatch]);
}
