import { useEffect, useState } from 'react';
import useTests from '../../hooks/useTests';
import { TestStatus } from '../../types';
import Button, { ButtonType } from '../buttons/Button';
import Modal from './Modal';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'followModalHiddenUntil';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FOREVER = new Date('9999-12-31T00:00:00.000Z');

export default function FollowModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { crudTests, dataDrivenTests, performanceTests, securityTests } = useTests();
  const hasAnyBug = [crudTests, dataDrivenTests, performanceTests, securityTests].some((tests) =>
    tests.some((test) => test.status === TestStatus.Bug),
  );

  useEffect(() => {
    if (!hasAnyBug) return;

    const storedValue = localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = storedValue ? new Date(storedValue).getTime() : NaN;
    if (!Number.isNaN(hiddenUntil) && Date.now() < hiddenUntil) return;

    setIsOpen(true);
  }, [hasAnyBug]);

  const onClose = (hideUntil: Date = FOREVER) => {
    localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(new Date(Date.now() + WEEK_MS))}>
      <div className="flex flex-col gap-4">
        <h4 className="m-0">🎉 {t('modals.follow.title')}</h4>
        <p className="m-0 text-sm dark:text-text-secondary">{t('modals.follow.message')}</p>
        <p className="m-0 text-sm dark:text-text-secondary">{t('modals.follow.followUs')}</p>
        <div className="flex items-center justify-end gap-4">
          <Button
            onClick={() => {
              window.electronAPI.openExternal('https://www.linkedin.com/company/therentgen');
              onClose();
            }}
          >
            {t('modals.follow.followOnLinkedIn')}
          </Button>
          <Button buttonType={ButtonType.SECONDARY} onClick={() => onClose(new Date(Date.now() + WEEK_MS))}>
            {t('modals.follow.later')}
          </Button>
          <Button buttonType={ButtonType.SECONDARY} onClick={() => onClose()}>
            {t('modals.follow.neverAskAgain')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
