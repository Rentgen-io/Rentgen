import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportPostmanCollection, importPostmanCollection } from 'src/api/files';
import MethodBadge from 'src/components/badges/MethodBadge';
import Loader from 'src/components/loaders/Loader';
import { notify } from 'src/services/notify';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionData, selectCollectionLoading, selectSidebarFolders } from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { canMoveNode, detectImportConflicts, filterCollectionsBySearch } from 'src/utils/collection';
import SideBarSearch from '../SidebarSearch';
import CollectionGroup from './CollectionGroup';
import { getDropTarget, resolveDropPosition, setDropTarget, TreeNodeDndData } from './treeDnd';

import AddIcon from 'src/assets/icons/add-icon.svg';
import ExportIcon from 'src/assets/icons/export-icon.svg';
import FolderIcon from 'src/assets/icons/folder-icon.svg';
import ImportIcon from 'src/assets/icons/import-icon.svg';

// The row under the pointer; with the keyboard (no pointer) the row closest to the dragged one
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

// Rows are measured continuously while dragging: folders opening under the pointer (see CollectionGroup) add rows
const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

export default function CollectionsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const folders = useAppSelector(selectSidebarFolders);
  const collection = useAppSelector(selectCollectionData);
  const loading = useAppSelector(selectCollectionLoading);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [draggedNode, setDraggedNode] = useState<TreeNodeDndData | null>(null);

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

    if (!result.collection) return;

    const conflictSummary = detectImportConflicts(collection, result.collection);
    if (conflictSummary.hasConflicts) {
      dispatch(modalsActions.openImportConflictModal({ collection: result.collection, conflictSummary }));
      return;
    }

    dispatch(collectionActions.importCollection({ collection: result.collection, mode: 'merge' }));
    notify.success(t('common.imported'), { toastId: 'success-import-collection' });
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
    useSensor(KeyboardSensor),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggedNode((active.data.current as TreeNodeDndData | undefined) ?? null);
  };

  // Where the dragged row would be dropped, shown by the row below it (see useTreeNodeDnd). Only allowed moves are
  // shown, e.g. not a folder into its own subfolder
  const handleDragMove = ({ activatorEvent, active, delta, over }: DragMoveEvent) => {
    const activeData = active.data.current as TreeNodeDndData | undefined;
    const overData = over?.data.current as TreeNodeDndData | undefined;
    const pointerY = getPointerY(activatorEvent, delta.y, active.rect.current.translated);

    if (!over || !activeData || !overData || pointerY === null) {
      setDropTarget(null);
      return;
    }

    const position = resolveDropPosition(overData, activeData.type, (pointerY - over.rect.top) / over.rect.height);
    const isAllowed = canMoveNode(collection, String(active.id), String(over.id), position);

    setDropTarget(isAllowed ? { id: String(over.id), position } : null);
  };

  const handleDragEnd = ({ active }: DragEndEvent) => {
    const target = getDropTarget();

    setDropTarget(null);
    setDraggedNode(null);

    if (target)
      dispatch(
        collectionActions.moveNode({ nodeId: String(active.id), position: target.position, targetId: target.id }),
      );
  };

  const handleDragCancel = () => {
    setDropTarget(null);
    setDraggedNode(null);
  };

  return (
    <>
      <div className="h-8 shrink-0 flex items-center justify-between gap-2 p-1 box-border">
        <div
          className="h-full flex items-center gap-2 w-full py-1 px-2 rounded hover:bg-muted box-border cursor-pointer outline-none"
          onClick={() => dispatch(collectionActions.addFolder({ name: t('collections.newFolder') }))}
        >
          <AddIcon className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('collections.newFolder')}</span>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <ImportIcon
            className="size-4 text-muted-foreground hover:text-blue-600 cursor-pointer"
            onClick={handleImport}
          />
          <ExportIcon
            className="size-4 text-muted-foreground hover:text-blue-600 cursor-pointer"
            onClick={handleExport}
          />
        </div>
      </div>
      <SideBarSearch value={searchTerm} onChange={setSearchTerm} />
      {loading ? (
        <div className="flex items-center justify-center h-full w-full p-4 text-xs text-muted-foreground">
          <Loader />
        </div>
      ) : filteredFolders.length > 0 ? (
        <div className="h-full p-1 overflow-x-hidden overflow-y-auto">
          <DndContext
            collisionDetection={collisionDetection}
            measuring={measuring}
            sensors={sensors}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            onDragOver={handleDragMove}
            onDragStart={handleDragStart}
          >
            {filteredFolders.map((folder) => (
              <CollectionGroup
                key={folder.id}
                depth={0}
                folder={folder}
                searchTerm={isSearching ? searchTerm : undefined}
              />
            ))}
            <DragOverlay dropAnimation={null}>{draggedNode && <DragPreview node={draggedNode} />}</DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full p-4 text-xs text-muted-foreground">
          {isSearching ? t('collections.noMatchingRequests') : t('collections.noSavedRequests')}
        </div>
      )}
    </>
  );
}

/** What follows the pointer while dragging a row. */
function DragPreview({ node }: { node: TreeNodeDndData }) {
  return (
    <div className="h-6 max-w-60 inline-flex items-center gap-2 px-2 rounded bg-background shadow-default cursor-grabbing">
      {node.type === 'folder' ? <FolderIcon className="size-4 shrink-0" /> : <MethodBadge method={node.method ?? ''} />}
      <span className="text-xs truncate">{node.name}</span>
    </div>
  );
}

/**
 * The pointer's vertical position: where the drag started plus how far it moved. A keyboard drag has no pointer: the
 * middle of the dragged row is used then.
 */
function getPointerY(
  activatorEvent: Event | null,
  deltaY: number,
  draggedRect: { top: number; height: number } | null,
): number | null {
  if (activatorEvent && 'clientY' in activatorEvent) return (activatorEvent as MouseEvent).clientY + deltaY;

  return draggedRect ? draggedRect.top + draggedRect.height / 2 : null;
}
