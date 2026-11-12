import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal } from 'src/api/system';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import Modal from 'src/components/modals/Modal';
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

  return (
    <Modal className="[&>div]:w-100!" isOpen={isOpen} onClose={() => onClose(new Date(Date.now() + WEEK_MS))}>
      <div className="flex flex-col gap-4">
        <h5 className="m-0">🎉 {t('modals.follow.title')}</h5>
        <p className="m-0 text-xs text-muted-foreground">{t('modals.follow.message')}</p>
        <p className="m-0 text-xs text-muted-foreground">{t('modals.follow.followUs')}</p>
        <div className="flex items-center justify-end gap-2">
          <Button buttonSize={ButtonSize.SMALL} buttonType={ButtonType.SECONDARY_OUTLINE} onClick={() => onClose()}>
            {t('modals.follow.neverAskAgain')}
          </Button>
          <Button
            buttonSize={ButtonSize.SMALL}
            buttonType={ButtonType.SECONDARY}
            onClick={() => onClose(new Date(Date.now() + WEEK_MS))}
          >
            {t('modals.follow.later')}
          </Button>
          <Button
            buttonSize={ButtonSize.SMALL}
            onClick={() => {
              openExternal('https://www.linkedin.com/company/therentgen');
              onClose();
            }}
          >
            {t('modals.follow.followOnLinkedIn')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
