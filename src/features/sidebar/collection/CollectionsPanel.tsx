import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportPostmanCollection, importPostmanCollection } from 'src/api/files';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionData, selectSidebarFolders } from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { detectImportConflicts, filterCollectionsBySearch } from 'src/utils';
import { notify } from 'src/utils/toast';
import SideBarSearch from '../SidebarSearch';
import CollectionGroup from './CollectionGroup';

import AddIcon from 'src/assets/icons/add-icon.svg';
import ExportIcon from 'src/assets/icons/export-icon.svg';
import ImportIcon from 'src/assets/icons/import-icon.svg';

export default function CollectionsPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const folders = useAppSelector(selectSidebarFolders);
  const collection = useAppSelector(selectCollectionData);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const isSearching = searchTerm.trim().length > 0;
  const filteredFolders = useMemo(
    () => (isSearching ? filterCollectionsBySearch(folders, collection, searchTerm) : folders),
    [folders, collection, searchTerm, isSearching],
  );

  const handleImport = async () => {
    const result = await importPostmanCollection();
    if (result.canceled) return;

    if (result.error) {
      notify.error(t('collections.importFailed', { error: result.error }), { toastId: 'error-import-collection' });
      return;
    }

    if (result.collection) {
      const conflictSummary = detectImportConflicts(collection, result.collection);

      if (conflictSummary.hasConflicts) {
        dispatch(
          modalsActions.openImportConflictModal({
            collection: result.collection,
            conflictSummary,
            warnings: result.warnings || [],
          }),
        );
      } else {
        dispatch(collectionActions.importCollection({ collection: result.collection, mode: 'merge' }));

        const warningCount = result.warnings?.length || 0;
        if (warningCount > 0)
          notify.warning(t('collections.importedWithWarnings', { count: warningCount }), {
            toastId: 'warning-import-collection',
          });
        else notify.success(t('common.imported'), { toastId: 'success-import-collection' });
      }
    }
  };

  const handleExport = async () => {
    const result = await exportPostmanCollection(collection);
    if (result.canceled) return;

    if (result.error) {
      notify.error(t('collections.exportFailed', { error: result.error }), { toastId: 'error-export-collection' });
      return;
    }

    notify.success(t('common.exported'), { toastId: 'success-export-collection' });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'folder') {
      dispatch(collectionActions.reorderFolder({ activeId: active.id as string, overId: over.id as string }));
      return;
    }

    if (activeType === 'item') {
      const activeFolderId = active.data.current?.folderId;

      if (overType === 'folder') {
        if (activeFolderId !== over.id) {
          dispatch(collectionActions.moveRequest({ itemId: active.id as string, targetFolderId: over.id as string }));
        }
        return;
      }

      if (overType === 'item') {
        const overFolderId = over.data.current?.folderId;

        if (activeFolderId === overFolderId) {
          dispatch(collectionActions.reorderRequest({ activeId: active.id as string, overId: over.id as string }));
        } else {
          const targetFolder = folders.find((f) => f.id === overFolderId);
          const targetIndex = targetFolder?.items.findIndex((i) => i.id === over.id) ?? -1;
          dispatch(
            collectionActions.moveRequest({
              itemId: active.id as string,
              targetFolderId: overFolderId as string,
              targetIndex: targetIndex >= 0 ? targetIndex : undefined,
            }),
          );
        }
      }
    }
  };

  const handleStartEdit = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setEditingFolderId(folderId);
      setEditingName(folder.name);
    }
  };

  const handleSaveEdit = (folderId: string, newName: string) => {
    if (newName.trim()) {
      dispatch(collectionActions.renameFolder({ folderId, newName: newName.trim() }));
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingFolderId(null);
    setEditingName('');
  };

  // Create flat list of all sortable IDs (folders + all items from all folders)
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    folders.forEach((folder) => {
      ids.push(folder.id);
      folder.items.forEach((item) => ids.push(item.id));
    });
    return ids;
  }, [folders]);

  return (
    <>
      <div className="h-9 shrink-0 flex items-center justify-between gap-2 border-b border-border dark:border-dark-border box-border">
        <div
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-button-secondary dark:hover:bg-dark-input cursor-pointer outline-none"
          onClick={() => dispatch(collectionActions.addFolder('New Folder'))}
          title={t('collections.newFolder')}
        >
          <AddIcon className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary" />
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {t('collections.newFolder')}
          </span>
        </div>
        <div className="flex items-center gap-1 pe-2">
          <ImportIcon
            className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary hover:text-button-primary cursor-pointer"
            onClick={handleImport}
            title={t('collections.importCollection')}
          />
          <ExportIcon
            className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary hover:text-button-primary cursor-pointer"
            onClick={handleExport}
            title={t('collections.exportCollection')}
          />
        </div>
      </div>

      <SideBarSearch value={searchTerm} onChange={setSearchTerm} />

      {filteredFolders.length > 0 ? (
        <div className="h-full overflow-x-hidden overflow-y-auto">
          {isSearching ? (
            filteredFolders.map((folder) => (
              <CollectionGroup
                key={folder.id}
                folder={folder}
                isEditing={editingFolderId === folder.id}
                editingName={editingName}
                searchTerm={searchTerm}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditingNameChange={setEditingName}
              />
            ))
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
                {folders.map((folder) => (
                  <CollectionGroup
                    key={folder.id}
                    folder={folder}
                    isEditing={editingFolderId === folder.id}
                    editingName={editingName}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditingNameChange={setEditingName}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full p-5 text-xs text-text-secondary dark:text-dark-text-secondary">
          {isSearching ? t('collections.noMatchingRequests') : t('collections.noSavedRequests')}
        </div>
      )}
    </>
  );
}
