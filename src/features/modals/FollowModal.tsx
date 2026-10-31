import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectOpenFollowModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { TestStatus } from 'src/types';

const STORAGE_KEY = 'followModalHiddenUntil';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FOREVER = new Date('9999-12-31T00:00:00.000Z');

export default function FollowModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { crudTests, dataDrivenTests, performanceTests, securityTests } = useTests();

  const isOpen = useAppSelector(selectOpenFollowModal);
  const hasAnyBug = [crudTests, dataDrivenTests, performanceTests, securityTests].some((tests) =>
    tests.some((test) => test?.status === TestStatus.Bug),
  );

  useEffect(() => {
    if (!hasAnyBug) return;

    const storedValue = localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = storedValue ? new Date(storedValue).getTime() : NaN;
    if (!Number.isNaN(hiddenUntil) && Date.now() < hiddenUntil) return;

    dispatch(modalsActions.openFollowModal());
  }, [hasAnyBug]);

  const onClose = (hideUntil: Date = FOREVER) => {
    localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    dispatch(modalsActions.closeFollowModal());
  };

  if (!isOpen) return null;

  return (
    <aside className="follow-prompt" aria-label={t('modals.follow.title')}>
      <p>{t('modals.follow.followUs')}</p>
      <div className="follow-prompt-actions">
        <Button
          buttonType={ButtonType.SECONDARY}
          onClick={() => {
            openExternal('https://www.linkedin.com/company/therentgen');
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
    </aside>
  );
}
