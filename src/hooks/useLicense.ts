import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectLicense } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { verifyLicense } from 'src/utils';

export function useLicense() {
  const dispatch = useAppDispatch();
  const license = useAppSelector(selectLicense);

  const [isValidating, setIsValidating] = useState(false);

  const validateLicense = useCallback(
    async (key: string | null, saveInvalid = true) => {
      setIsValidating(true);

      const result = await verifyLicense(key);
      if (result.valid || saveInvalid) dispatch(settingsActions.setLicense({ key, result }));

      setIsValidating(false);

      return result;
    },
    [dispatch],
  );

  return { isValidating, license, validateLicense };
}
