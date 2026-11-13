import { useTranslation } from 'react-i18next';
import PromptModal from 'src/components/modals/PromptModal';
import { FOLLOW_PROMPT_STORAGE_KEY } from 'src/hooks/useTestRunEndPrompts';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectOpenFollowModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { DAY_MS } from 'src/utils';

/** Opened by useTestRunEndPrompts when a test run finds a bug. */
export default function FollowModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isOpen = useAppSelector(selectOpenFollowModal);

  return (
    <PromptModal
      actionLabel={t('modals.follow.followOnLinkedIn')}
      actionUrl="https://www.linkedin.com/company/therentgen"
      isOpen={isOpen}
      laterLabel={t('modals.follow.later')}
      messages={[t('modals.follow.message'), t('modals.follow.followUs')]}
      neverAskAgainLabel={t('modals.follow.neverAskAgain')}
      snoozeMs={7 * DAY_MS}
      storageKey={FOLLOW_PROMPT_STORAGE_KEY}
      title={`🎉 ${t('modals.follow.title')}`}
      onClose={() => dispatch(modalsActions.closeFollowModal())}
    />
  );
}
