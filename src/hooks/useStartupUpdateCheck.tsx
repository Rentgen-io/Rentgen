import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { openExternal } from 'src/api/system';
import { checkForUpdate, getUpdateDownloadUrl } from 'src/api/update';
import Button, { ButtonSize } from 'src/components/buttons/Button';
import { notify } from 'src/services/notify';
import { store } from 'src/store';
import { useAppSelector } from 'src/store/hooks';
import { selectTheme } from 'src/store/selectors';

const UPDATE_TOAST_ID = 'update-available';

// A component (not a pre-translated string) so the text follows the language once settings finish loading.
function UpdateAvailableToast({ currentVersion, latestVersion }: { currentVersion: string; latestVersion: string }) {
  const { t } = useTranslation();

  return (
    <span className="flex flex-col items-start gap-2">
      <span className="whitespace-pre-line">
        {t('settings.update.newVersionAvailable', { current: currentVersion, latest: latestVersion })}
      </span>
      <Button buttonSize={ButtonSize.SMALL} onClick={() => openExternal(getUpdateDownloadUrl(currentVersion))}>
        {t('settings.update.download')}
      </Button>
    </span>
  );
}

/** Checks GitHub once on startup and shows a toast only when a newer version is available; stays silent otherwise. */
export function useStartupUpdateCheck() {
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    checkForUpdate().then((result) => {
      if (result.status !== 'updateAvailable') return;

      notify.info(
        <UpdateAvailableToast currentVersion={result.currentVersion} latestVersion={result.latestVersion} />,
        {
          autoClose: 10000,
          theme: selectTheme(store.getState()),
          toastId: UPDATE_TOAST_ID,
        },
      );
    });
  }, []);

  useEffect(() => {
    if (toast.isActive(UPDATE_TOAST_ID)) toast.update(UPDATE_TOAST_ID, { theme });
  }, [theme]);
}
