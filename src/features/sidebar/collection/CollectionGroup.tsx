import cn from 'classnames';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchHighlighter from 'src/components/highlighters/SearchHighlighter';
import { useContextMenu } from 'src/features/context-menu';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionRunResults, selectRunningFolderId, selectSelectedFolderId } from 'src/store/selectors';
import { CollectionRunResult } from 'src/store/slices/collectionRunSlice';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { CollectionFolderData } from 'src/utils/collection';
import { isAbortedResponse } from 'src/utils/http';
import CollectionItem from './CollectionItem';
import RowActionsMenu from './RowActionsMenu';
import { DropIndicator, getIndent, useTreeNodeDnd } from './treeDnd';
import { useCollectionRunner } from './useCollectionRunner';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';
import FolderIcon from 'src/assets/icons/folder-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';

// How long a dragged row must hover a collapsed folder before it opens (like Postman), to drop between its entries
const AUTO_EXPAND_DELAY = 600;

// The folder just created with "Add Folder": its row starts in rename mode when it mounts
let folderIdToRename: string | null = null;

interface Props {
  /** Nesting level: 0 for a top-level folder. */
  depth: number;
  folder: CollectionFolderData;
  searchTerm?: string;
}

/**
 * A folder in the sidebar with its requests and subfolders. Subscribes only to what this row shows (its selection,
 * status color, run state) and keeps its rename state itself: other folders don't re-render with it (memo).
 */
function CollectionGroup({ depth, folder, searchTerm }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { cancelFolderRun, runFolder } = useCollectionRunner();
  const { isOpen } = useContextMenu();

  const isSelected = useAppSelector((state) => selectSelectedFolderId(state) === folder.id);
  const runningFolderId = useAppSelector(selectRunningFolderId);
  const statusClassName = useAppSelector((state) =>
    getFolderStatusClassName(folder.requestIds, selectCollectionRunResults(state)),
  );

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(() => folderIdToRename === folder.id);
  const [editingName, setEditingName] = useState<string>(folder.name);

  const hasChildren = folder.children.length > 0;
  const isThisFolderRunning = runningFolderId === folder.id;
  const isOtherFolderRunning = runningFolderId !== null && runningFolderId !== folder.id;
  const canRun = folder.requestIds.length > 0 && !isOtherFolderRunning;

  const indent = getIndent(depth);
  // Not draggable while searching: the list then shows only the matches, so drop positions would be misleading
  const { attributes, dropPosition, isDragging, listeners, setNodeRef } = useTreeNodeDnd(
    folder.id,
    { type: 'folder', name: folder.name, hasChildren, isExpanded, isTopLevel: folder.isTopLevel },
    Boolean(searchTerm),
  );

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded((prevIsExpanded) => !prevIsExpanded);

    if (!isSelected) dispatch(collectionActions.selectFolder(folder.id));
  };

  const handleAddFolder = () => {
    const action = collectionActions.addFolder({ name: t('collections.newFolder'), parentId: folder.id });

    folderIdToRename = action.payload.id;
    dispatch(action);
    setIsExpanded(true);
  };

  const handleRename = () => {
    setEditingName(folder.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newName = editingName.trim();
    if (newName && newName !== folder.name) dispatch(collectionActions.renameFolder({ folderId: folder.id, newName }));

    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!hasChildren) dispatch(collectionActions.removeFolder(folder.id));
    else dispatch(modalsActions.openDeleteFolderModal({ id: folder.id, name: folder.name }));
  };

  const toggleRun = () => {
    if (isThisFolderRunning) cancelFolderRun();
    else runFolder(folder.id);
  };

  const handlePlayClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleRun();
  };

  // The rename mode requested by "Add Folder" is taken once (an effect: the state initializer may run twice)
  useEffect(() => {
    if (folderIdToRename === folder.id) folderIdToRename = null;
  }, [folder.id]);

  useEffect(() => {
    const isSearching = Boolean(searchTerm?.trim());
    if (isSearching) setIsExpanded(true);
  }, [searchTerm]);

  useEffect(() => {
    if (dropPosition !== 'inside' || isExpanded) return;

    const expandTimeout = setTimeout(() => setIsExpanded(true), AUTO_EXPAND_DELAY);
    return () => clearTimeout(expandTimeout);
  }, [dropPosition, isExpanded]);

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'relative h-6 flex items-center gap-2 py-1 pr-2 rounded',
          'hover:bg-muted has-aria-expanded:bg-muted box-border group cursor-pointer outline-none',
          {
            'bg-muted': isSelected && dropPosition !== 'inside',
            'opacity-50': isDragging,
            'bg-accent-soft ring-1 ring-inset ring-primary': dropPosition === 'inside',
          },
        )}
        style={{ paddingLeft: indent }}
        onClick={handleClick}
        {...attributes}
        {...listeners}
      >
        <ChevronIcon
          className={cn('size-4 -mx-0.5 shrink-0 text-muted-foreground', {
            'rotate-90': isExpanded,
          })}
        />
        {statusClassName && <span className={cn('size-1.75 rounded-full shrink-0', statusClassName)} />}
        <FolderIcon className="size-4 shrink-0" />

        {isEditing ? (
          <input
            autoFocus
            className="flex-1 py-px px-1 text-xs leading-none bg-transparent text-foreground border border-blue-300 outline-none"
            value={editingName}
            type="text"
            onBlur={() => !isOpen && handleSaveEdit()}
            onChange={(event) => setEditingName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') handleSaveEdit();
              else if (event.key === 'Escape') setIsEditing(false);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="text-xs truncate">
            {searchTerm ? <SearchHighlighter text={folder.name} term={searchTerm} /> : folder.name}
          </span>
        )}

        <span className={cn('text-xs text-muted-foreground', { 'flex-auto text-right': !isEditing })}>
          {folder.requestIds.length}
        </span>

        {!isEditing && (
          <div
            className={cn(
              'absolute top-0 bottom-0 right-0 px-2 flex items-center gap-1 rounded bg-muted',
              'opacity-0 group-hover:opacity-100 has-focus-visible:opacity-100 has-aria-expanded:opacity-100',
            )}
          >
            {canRun &&
              (isThisFolderRunning ? (
                <StopIcon
                  className="size-4 text-red-500 hover:text-red-600 cursor-pointer"
                  title={t('common.stop')}
                  onClick={handlePlayClick}
                />
              ) : (
                <PlayIcon
                  className="size-4 text-green-500 hover:text-green-600 cursor-pointer"
                  title={t('common.run')}
                  onClick={handlePlayClick}
                />
              ))}
            <RowActionsMenu
              actions={[
                { label: t('collections.addFolder'), onClick: handleAddFolder },
                {
                  label: isThisFolderRunning ? t('common.stop') : t('common.run'),
                  disabled: !canRun,
                  divider: true,
                  onClick: toggleRun,
                },
                { label: t('common.rename'), divider: true, onClick: handleRename },
                { label: t('common.delete'), destructive: true, onClick: handleDelete },
              ]}
            />
          </div>
        )}

        <DropIndicator position={dropPosition} />
      </div>

      {isExpanded &&
        folder.children.map((child) =>
          child.type === 'folder' ? (
            <MemoizedCollectionGroup key={child.id} depth={depth + 1} folder={child} searchTerm={searchTerm} />
          ) : (
            <CollectionItem key={child.id} depth={depth + 1} item={child} searchTerm={searchTerm} />
          ),
        )}
    </>
  );
}

// Re-renders only when its props change: unchanged folders keep their sidebar object (collectionToGroupedSidebarData).
// Also used for the subfolders, so they are memoized too
const MemoizedCollectionGroup = memo(CollectionGroup);

export default MemoizedCollectionGroup;

/** The folder's status dot color from its requests' run results (also in subfolders), or null when none of them ran. */
function getFolderStatusClassName(
  requestIds: string[],
  runResults: Record<string, CollectionRunResult>,
): string | null {
  const results = requestIds.map((requestId) => runResults[requestId]).filter(Boolean);

  if (results.length === 0) return null;

  // Requests cancelled by the user are neutral: they don't count as errors, but the folder isn't fully green either.
  // An error from before the cancel still wins (red / orange / yellow first)
  const itemResults = results.filter((r) => !isAbortedResponse(r.response));
  const hasAborted = itemResults.length < results.length;

  const hasRed = itemResults.some((r) => !r.status || r.status < 200 || r.status >= 500);
  const hasOrange = itemResults.some((r) => r.status && r.status >= 400 && r.status < 500);
  const hasYellow = itemResults.some((r) => r.warning && r.status && r.status >= 200 && r.status < 400);

  if (hasRed) return 'bg-metric-fail';
  if (hasOrange) return 'bg-primary';
  if (hasYellow) return 'bg-metric-warning';
  if (hasAborted) return 'bg-muted-foreground';

  return 'bg-metric-pass';
}
