import { useDraggable, useDroppable } from '@dnd-kit/core';
import cn from 'classnames';
import { useCallback, useSyncExternalStore } from 'react';
import { DropPosition } from 'src/utils/collection';

// Left padding of a top-level row, and the indentation of each nesting level: a chevron and the gap after it, so a
// nested row starts under its parent folder's icon
const ROW_PADDING = 8;
const INDENT_STEP = 20;

/** The left padding of a row at `depth` (0: top-level folder, 1: what's directly in it, ...). */
export function getIndent(depth: number): number {
  return ROW_PADDING + depth * INDENT_STEP;
}

/** What a sidebar row tells the drag and drop about itself: for the drop position, and the preview while dragging. */
export interface TreeNodeDndData {
  type: 'folder' | 'request';
  name: string;
  method?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  isTopLevel?: boolean;
}

export interface DropTarget {
  id: string;
  position: DropPosition;
}

// The current drop target lives outside React state: it changes while the pointer moves, and only the rows it moves
// between must re-render (useTreeNodeDnd), not the whole panel
let dropTarget: DropTarget | null = null;
const dropTargetListeners = new Set<() => void>();

export function getDropTarget(): DropTarget | null {
  return dropTarget;
}

export function setDropTarget(target: DropTarget | null) {
  if (target?.id === dropTarget?.id && target?.position === dropTarget?.position) return;

  dropTarget = target;
  dropTargetListeners.forEach((listener) => listener());
}

function subscribeToDropTarget(listener: () => void) {
  dropTargetListeners.add(listener);
  return () => dropTargetListeners.delete(listener);
}

/**
 * Makes a sidebar row draggable and a drop target, and tells where a dragged row would be dropped on it (null when
 * not on this row).
 */
export function useTreeNodeDnd(id: string, data: TreeNodeDndData, disabled: boolean) {
  const { attributes, isDragging, listeners, setNodeRef: setDraggableRef } = useDraggable({ id, data, disabled });
  const { setNodeRef: setDroppableRef } = useDroppable({ id, data, disabled });

  const setNodeRef = useCallback(
    (element: HTMLElement | null) => {
      setDraggableRef(element);
      setDroppableRef(element);
    },
    [setDraggableRef, setDroppableRef],
  );

  const dropPosition = useSyncExternalStore(subscribeToDropTarget, () =>
    dropTarget?.id === id ? dropTarget.position : null,
  );

  return { attributes, dropPosition, isDragging, listeners, setNodeRef };
}

/**
 * Where a dragged row goes, from where the pointer is on the row below it (`offset`: 0 at its top, 1 at its bottom),
 * like in Postman: on a request its upper / lower half (before / after it); on a folder its top / bottom quarter
 * (before / after it, or above its first entry when it's expanded) and otherwise into it. Requests dragged onto a
 * top-level folder always go into it: the top level holds only folders.
 */
export function resolveDropPosition(
  over: TreeNodeDndData,
  activeType: TreeNodeDndData['type'],
  offset: number,
): DropPosition {
  if (over.type === 'request') return offset < 0.5 ? 'before' : 'after';

  const isOpenWithChildren = over.isExpanded && over.hasChildren;

  if (activeType === 'request' && over.isTopLevel) return offset > 0.75 && isOpenWithChildren ? 'first' : 'inside';
  if (offset < 0.25) return 'before';
  if (offset > 0.75) return isOpenWithChildren ? 'first' : 'after';

  return 'inside';
}

interface DropIndicatorProps {
  position: DropPosition | null;
}

/** The full-width line where a dragged row would be dropped: above or below the row ('after' and 'first'). */
export function DropIndicator({ position }: DropIndicatorProps) {
  if (!position || position === 'inside') return null;

  return (
    <span
      className={cn('absolute left-0 right-0 h-px bg-primary pointer-events-none z-10', {
        'top-0': position === 'before',
        '-bottom-px': position !== 'before',
      })}
    />
  );
}
