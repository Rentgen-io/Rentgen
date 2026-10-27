import { useCallback } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { OpenApiDocument } from 'src/types';
import { openApiToFolder } from 'src/utils';

export function useOpenApiImport() {
  const dispatch = useAppDispatch();

  return useCallback(
    (document: OpenApiDocument, sourceUrl?: string): boolean => {
      try {
        const folder = openApiToFolder(document, sourceUrl);
        if (folder.item.length === 0) return false;

        dispatch(collectionActions.importFolder(folder));

        return true;
      } catch {
        return false;
      }
    },
    [dispatch],
  );
}
