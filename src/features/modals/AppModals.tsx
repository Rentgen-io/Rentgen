import { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonType } from 'src/components/buttons/Button';
import ConfirmationModal from 'src/components/modals/ConfirmationModal';
import SetAsDynamicVariableModal from 'src/features/environment/SetAsDynamicVariableModal';
import ImportConflictModal from 'src/features/settings/ImportConflictModal';
import ProjectImportConfirmModal from 'src/features/settings/ProjectImportConfirmModal';
import SettingsModal from 'src/features/settings/SettingsModal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectDeleteFolderModal,
  selectEnvironmentToDelete,
  selectOpenReloadModal,
  selectOpenSendHttpSuccessModal,
} from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import FollowModal from './FollowModal';
import GitHubModal from './GitHubModal';

interface Props {
  parametersRef: RefObject<HTMLDivElement | null>;
}

export default function AppModals({ parametersRef }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const openReloadModal = useAppSelector(selectOpenReloadModal);
  const openSendHttpSuccessModal = useAppSelector(selectOpenSendHttpSuccessModal);
  const environmentToDelete = useAppSelector(selectEnvironmentToDelete);
  const deleteFolderModal = useAppSelector(selectDeleteFolderModal);

  return (
    <>
      <ConfirmationModal
        confirmText={t('modals.reload.confirmText')}
        description={t('modals.reload.description')}
        title={t('modals.reload.title')}
        isOpen={openReloadModal}
        onClose={() => dispatch(modalsActions.closeReloadModal())}
        onConfirm={() => window.location.reload()}
      />
      <ConfirmationModal
        cancelText={t('common.close')}
        confirmText={t('modals.sendHttpSuccess.confirmText')}
        confirmType={ButtonType.PRIMARY}
        description={t('modals.sendHttpSuccess.description')}
        title={t('modals.sendHttpSuccess.title')}
        isOpen={openSendHttpSuccessModal}
        onClose={() => dispatch(modalsActions.closeSendHttpSuccessModal())}
        onConfirm={() => {
          parametersRef.current?.scrollIntoView({ behavior: 'smooth' });
          dispatch(modalsActions.closeSendHttpSuccessModal());
        }}
      >
        <label className="flex items-center gap-1 text-xs">
          <input
            className="m-0"
            type="checkbox"
            onChange={(event) =>
              localStorage.setItem('sendHttpSuccessModalDoNotShowAgain', event.target.checked.toString())
            }
          />
          {t('modals.sendHttpSuccess.doNotShowAgain')}
        </label>
      </ConfirmationModal>
      <ConfirmationModal
        confirmText={t('common.delete')}
        description={t('environment.deleteEnvironmentConfirm')}
        title={t('environment.deleteEnvironment')}
        isOpen={!!environmentToDelete}
        onClose={() => dispatch(environmentActions.setEnvironmentToDelete(null))}
        onConfirm={() => {
          if (environmentToDelete) dispatch(environmentActions.deleteEnvironment(environmentToDelete));

          dispatch(environmentActions.setEnvironmentToDelete(null));
        }}
      />
      <ConfirmationModal
        confirmText={t('common.delete')}
        description={t('modals.deleteFolder.description')}
        title={t('modals.deleteFolder.title')}
        isOpen={deleteFolderModal.isOpen}
        onClose={() => dispatch(modalsActions.closeDeleteFolderModal())}
        onConfirm={() => {
          if (deleteFolderModal.folderId) dispatch(collectionActions.removeFolder(deleteFolderModal.folderId));

          dispatch(modalsActions.closeDeleteFolderModal());
        }}
      />
      <SetAsDynamicVariableModal />
      <ImportConflictModal />
      <ProjectImportConfirmModal />
      <SettingsModal />
      <FollowModal />
      <GitHubModal />
    </>
  );
}
