import { useTranslation } from 'react-i18next';
import PromptModal from 'src/components/modals/PromptModal';
import { GITHUB_PROMPT_STORAGE_KEY } from 'src/hooks/useTestRunEndPrompts';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectOpenGitHubModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { DAY_MS } from 'src/utils';

/** Opened by useTestRunEndPrompts when a test run finishes without bugs (or the "Follow" prompt is hidden). */
export default function GitHubModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isOpen = useAppSelector(selectOpenGitHubModal);

  return (
    <PromptModal
      actionLabel={t('modals.gitHub.starOnGitHub')}
      actionUrl="https://github.com/Rentgen-io/Rentgen"
      isOpen={isOpen}
      laterLabel={t('modals.gitHub.later')}
      messages={[t('modals.gitHub.message')]}
      neverAskAgainLabel={t('modals.gitHub.neverAskAgain')}
      snoozeMs={3 * DAY_MS}
      storageKey={GITHUB_PROMPT_STORAGE_KEY}
      title={`⭐ ${t('modals.gitHub.title')}`}
      onClose={() => dispatch(modalsActions.closeGitHubModal())}
    />
  );
}
