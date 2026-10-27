import { useCallback } from 'react';
import { OpenApiSchema } from 'src/utils';
import { useReset } from './useReset';

export function useOpenApiImport() {
  const reset = useReset();

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (schema: OpenApiSchema): boolean => {
      // TODO: implement OpenAPI import
      reset();

      return true;
    },
    [],
  );
}
