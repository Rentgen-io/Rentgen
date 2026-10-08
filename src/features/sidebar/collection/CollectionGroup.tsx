import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import SearchHighlighter from 'src/components/highlighters/SearchHighlighter';
import { useCollectionRunner } from 'src/hooks/useCollectionRunner';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionRunResults, selectRunningFolderId, selectSelectedFolderId } from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { CollectionFolderData } from 'src/utils';
import { useContextMenu } from 'src/features/context-menu';
import CollectionItem from './CollectionItem';

import ChevronIcon from 'src/assets/icons/chevron-icon.svg';
import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import EditIcon from 'src/assets/icons/edit-icon.svg';
import FolderIcon from 'src/assets/icons/folder-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';

interface Props {
  folder: CollectionFolderData;
  isEditing: boolean;
  editingName: string;
  searchTerm?: string;
  onStartEdit: (folderId: string) => void;
  onSaveEdit: (folderId: string, newName: string) => void;
  onCancelEdit: () => void;
  onEditingNameChange: (name: string) => void;
}

export default function CollectionGroup({
  folder,
  isEditing,
  editingName,
  searchTerm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingNameChange,
}: Props) {
  const dispatch = useAppDispatch();
  const { runFolder, cancelRun } = useCollectionRunner();
  const { isOpen } = useContextMenu();

  const selectedFolderId = useAppSelector(selectSelectedFolderId);
  const runningFolderId = useAppSelector(selectRunningFolderId);
  const runResults = useAppSelector(selectCollectionRunResults);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isSelected = folder.id === selectedFolderId;
  const isThisFolderRunning = runningFolderId === folder.id;
  const isOtherFolderRunning = runningFolderId !== null && runningFolderId !== folder.id;

  const folderStatus = useMemo(() => {
    const itemResults = folder.items.map((item) => runResults[item.id]).filter(Boolean);

    if (itemResults.length === 0) return null;

    const hasRed = itemResults.some((r) => !r.status || r.status < 200 || r.status >= 500);
    const hasOrange = itemResults.some((r) => r.status && r.status >= 400 && r.status < 500);
    const hasYellow = itemResults.some((r) => r.warning && r.status && r.status >= 200 && r.status < 400);

    if (hasRed) return 'red';
    if (hasOrange) return 'orange';
    if (hasYellow) return 'yellow';
    return 'green';
  }, [folder.items, runResults]);

  const { attributes, isDragging, listeners, transform, transition, setNodeRef } = useSortable({
    id: folder.id,
    data: { type: 'folder' },
  });

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prevIsExpanded) => !prevIsExpanded);
    dispatch(collectionActions.selectFolder(folder.id));
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit(folder.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (folder.items.length === 0) dispatch(collectionActions.removeFolder(folder.id));
    else dispatch(modalsActions.openDeleteFolderModal(folder.id));
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisFolderRunning) cancelRun();
    else runFolder(folder.id);
  };

  useEffect(() => {
    const isSearching = Boolean(searchTerm?.trim());
    if (isSearching) setIsExpanded(true);
  }, [searchTerm]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={cn({
          'opacity-50 shadow-lg z-50': isDragging,
        })}
      >
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 border-b border-border dark:border-dark-input',
            'hover:bg-button-secondary dark:hover:bg-dark-input group cursor-pointer outline-none',
            {
              'bg-button-secondary dark:bg-dark-input': isSelected,
            },
          )}
          onClick={handleHeaderClick}
          {...attributes}
          {...listeners}
        >
          <ChevronIcon
            className={cn('h-4 w-4 text-text-secondary', {
              'rotate-90': isExpanded,
            })}
          />
          {folderStatus && (
            <span
              className={cn('w-2 h-2 rounded-full shrink-0', {
                'bg-green-500': folderStatus === 'green',
                'bg-yellow-500': folderStatus === 'yellow',
                'bg-orange-500': folderStatus === 'orange',
                'bg-red-500': folderStatus === 'red',
              })}
            />
          )}
          <FolderIcon className="h-4 w-4 text-text-secondary" />

          {isEditing ? (
            <input
              autoFocus
              className="flex-1 py-px px-1 text-xs leading-none bg-transparent border border-border dark:border-dark-input dark:text-dark-text outline-none"
              value={editingName}
              type="text"
              onBlur={() => !isOpen && onSaveEdit(folder.id, editingName)}
              onChange={(event) => onEditingNameChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') onSaveEdit(folder.id, editingName);
                else if (event.key === 'Escape') onCancelEdit();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <span className="text-xs truncate">
              {searchTerm ? <SearchHighlighter text={folder.name} term={searchTerm} /> : folder.name}
            </span>
          )}

          <span className={cn('text-xs text-text-secondary', { 'flex-auto': !isEditing })}>{folder.items.length}</span>

          {folder.items.length > 0 &&
            !isEditing &&
            !isOtherFolderRunning &&
            (isThisFolderRunning ? (
              <StopIcon
                className="h-4 w-4 shrink-0 text-red-500 hover:text-red-600 cursor-pointer"
                onClick={handlePlayClick}
              />
            ) : (
              <PlayIcon
                className="h-4 w-4 shrink-0 text-green-500 hover:text-green-600 cursor-pointer opacity-0 group-hover:opacity-100"
                onClick={handlePlayClick}
              />
            ))}

          {!isEditing && (
            <EditIcon
              className="h-4 w-4 shrink-0 text-button-text-secondary dark:text-text-secondary hover:text-button-primary cursor-pointer opacity-0 group-hover:opacity-100"
              onClick={handleEditClick}
            />
          )}

          {!isEditing && (
            <ClearCrossIcon
              className="h-4 w-4 shrink-0 text-button-text-secondary dark:text-text-secondary hover:text-button-danger cursor-pointer opacity-0 group-hover:opacity-100"
              onClick={handleDeleteClick}
            />
          )}
        </div>
      </div>

      {isExpanded && folder.items.length > 0 && (
        <div>
          {folder.items.map((item) => (
            <CollectionItem key={item.id} item={item} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </>
  );
}
