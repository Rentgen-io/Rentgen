import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useTests from '../../hooks/useTests';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOpenGitHubModal } from '../../store/selectors';
import { uiActions } from '../../store/slices/uiSlice';
import Button, { ButtonType } from '../buttons/Button';
import Modal from './Modal';

const STORAGE_KEY = 'gitHubModalHiddenUntil';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FOREVER = new Date('9999-12-31T00:00:00.000Z');

export default function GitHubModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isOpen = useAppSelector(selectOpenGitHubModal);
  const { crudTests, dataDrivenTests, performanceTests, securityTests, isRunning } = useTests();
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

    dispatch(uiActions.openGitHubModal());
  }, [isRun]);

  const onClose = (hideUntil: Date = FOREVER) => {
    localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    dispatch(uiActions.closeGitHubModal());
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(new Date(Date.now() + THREE_DAYS_MS))}>
      <div className="flex flex-col gap-4">
        <h4 className="m-0">⭐ {t('modals.gitHub.title')}</h4>
        <p className="m-0 text-sm dark:text-text-secondary">{t('modals.gitHub.message')}</p>
        <div className="flex items-center justify-end gap-4">
          <Button
            onClick={() => {
              window.electronAPI.openExternal('https://github.com/Rentgen-io/Rentgen');
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
