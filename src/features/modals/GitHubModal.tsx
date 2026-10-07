import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import Modal from 'src/components/modals/Modal';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectIsRunningTests, selectOpenGitHubModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';

const STORAGE_KEY = 'gitHubModalHiddenUntil';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FOREVER = new Date('9999-12-31T00:00:00.000Z');

export default function GitHubModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isOpen = useAppSelector(selectOpenGitHubModal);
  const isRunning = useAppSelector(selectIsRunningTests);
  const { crudTests, dataDrivenTests, performanceTests, securityTests } = useTests();
  const isRun =
    !isRunning && [crudTests, dataDrivenTests, performanceTests, securityTests].some((tests) => tests.length > 0);

  useEffect(() => {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) localStorage.setItem(STORAGE_KEY, new Date(Date.now() + WEEK_MS).toISOString());
  }, []);

  useEffect(() => {
    if (!isRun) return;

    const storedValue = localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = storedValue ? new Date(storedValue).getTime() : NaN;
    if (!Number.isNaN(hiddenUntil) && Date.now() < hiddenUntil) return;

    dispatch(modalsActions.openGitHubModal());
  }, [isRun]);

  const onClose = (hideUntil: Date = FOREVER) => {
    localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    dispatch(modalsActions.closeGitHubModal());
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(new Date(Date.now() + THREE_DAYS_MS))}>
      <div className="flex flex-col gap-4">
        <h4 className="m-0">⭐ {t('modals.gitHub.title')}</h4>
        <p className="m-0 text-sm dark:text-text-secondary">{t('modals.gitHub.message')}</p>
        <div className="flex items-center justify-end gap-4">
          <Button
            onClick={() => {
              openExternal('https://github.com/Rentgen-io/Rentgen');
              onClose();
            }}
          >
            {t('modals.gitHub.starOnGitHub')}
          </Button>
          <Button buttonType={ButtonType.SECONDARY} onClick={() => onClose(new Date(Date.now() + THREE_DAYS_MS))}>
            {t('modals.gitHub.later')}
          </Button>
          <Button buttonType={ButtonType.SECONDARY} onClick={() => onClose()}>
            {t('modals.gitHub.neverAskAgain')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
