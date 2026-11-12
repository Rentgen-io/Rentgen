import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import Modal from 'src/components/modals/Modal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionData, selectImportConflictModal } from 'src/store/selectors';
import { collectionActions, ImportMode } from 'src/store/slices/collectionSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { countMergeAdditions } from 'src/utils';
import { notify } from 'src/utils/toast';

export default function ImportConflictModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { isOpen, importedCollection, conflictSummary, warnings } = useAppSelector(selectImportConflictModal);
  const existingCollection = useAppSelector(selectCollectionData);

  const mergeStats = useMemo(() => {
    if (!importedCollection) return { folders: 0, requests: 0 };
    return countMergeAdditions(existingCollection, importedCollection);
  }, [existingCollection, importedCollection]);

  const handleClose = () => dispatch(modalsActions.closeImportConflictModal());

  const handleImport = (mode: ImportMode) => {
    if (importedCollection) {
      dispatch(collectionActions.importCollection({ collection: importedCollection, mode }));
      notify.success(t('common.imported'), { toastId: 'success-import-collection' });
    }

    handleClose();
  };

  if (!isOpen || !conflictSummary || !importedCollection) return null;

  const totalImportedFolders = importedCollection.item.length;
  const totalImportedRequests = importedCollection.item.reduce((acc, folder) => acc + folder.item.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col gap-4">
        <h5 className="m-0">{t('modals.importConflict.title')}</h5>
        <p className="m-0 text-xs text-muted-foreground">
          {t('modals.importConflict.conflictDescription', { name: importedCollection.info.name })}
        </p>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {conflictSummary.collectionNameMatch && (
            <p className="m-0 text-xs">- {t('modals.importConflict.collectionNamesMatch')}</p>
          )}
          {conflictSummary.folderConflicts.length > 0 && (
            <p className="m-0 text-xs">
              - {t('modals.importConflict.folderConflicts', { count: conflictSummary.folderConflicts.length })}
            </p>
          )}
          {conflictSummary.requestConflicts.length > 0 && (
            <p className="m-0 text-xs">
              - {t('modals.importConflict.requestConflicts', { count: conflictSummary.requestConflicts.length })}
            </p>
          )}
          {warnings.length > 0 && (
            <p className="m-0 mt-2 text-xs text-destructive">
              {t('modals.importConflict.importWarnings', { count: warnings.length })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <div className="p-3 border border-border rounded">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h5 className="m-0 font-bold">{t('common.replace')}</h5>
                <p className="m-0 text-xs text-muted-foreground">
                  {t('modals.importConflict.replaceDescription', {
                    folders: totalImportedFolders,
                    requests: totalImportedRequests,
                  })}
                </p>
              </div>
              <Button
                buttonSize={ButtonSize.SMALL}
                buttonType={ButtonType.DANGER}
                onClick={() => handleImport('replace')}
              >
                {t('common.replace')}
              </Button>
            </div>
          </div>

          <div className="p-3 border border-border rounded">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h5 className="m-0 font-bold">{t('common.merge')}</h5>
                <p className="m-0 text-xs text-muted-foreground">
                  {t('modals.importConflict.mergeDescription')}
                  {mergeStats.folders > 0 &&
                    ` - ${t('modals.importConflict.newFolders', { count: mergeStats.folders })}`}
                  {mergeStats.requests > 0 &&
                    ` - ${t('modals.importConflict.newRequests', { count: mergeStats.requests })}`}
                  {mergeStats.folders === 0 &&
                    mergeStats.requests === 0 &&
                    ' - ' + t('modals.importConflict.noNewItems')}
                </p>
              </div>
              <Button
                buttonSize={ButtonSize.SMALL}
                buttonType={ButtonType.SECONDARY}
                disabled={mergeStats.folders === 0 && mergeStats.requests === 0}
                onClick={() => handleImport('merge')}
              >
                {t('common.merge')}
              </Button>
            </div>
          </div>

          <div className="p-3 border border-border rounded">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h5 className="m-0 font-bold">{t('modals.importConflict.importAsCopy')}</h5>
                <p className="m-0 text-xs text-muted-foreground">
                  {t('modals.importConflict.copyDescription', {
                    folders: totalImportedFolders,
                    requests: totalImportedRequests,
                  })}
                </p>
              </div>
              <Button
                buttonSize={ButtonSize.SMALL}
                buttonType={ButtonType.SECONDARY}
                onClick={() => handleImport('copy')}
              >
                {t('common.copy')}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button buttonSize={ButtonSize.SMALL} buttonType={ButtonType.SECONDARY} onClick={handleClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
