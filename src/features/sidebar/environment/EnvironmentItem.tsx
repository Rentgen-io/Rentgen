import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cn from 'classnames';
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectSelectedEnvironmentId } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { Environment } from 'src/types';

import TrashIcon from 'src/assets/icons/trash-icon.svg';

interface Props {
  environment: Environment;
}

export default function EnvironmentItem({ environment }: Props) {
  const dispatch = useAppDispatch();

  const selectedEnvironmentId = useAppSelector(selectSelectedEnvironmentId);

  const isSelected = environment.id === selectedEnvironmentId;
  const { attributes, isDragging, listeners, transform, transition, setNodeRef } = useSortable({
    id: environment.id,
  });

  const onClick = useCallback(() => {
    if (isDragging) return;

    dispatch(environmentActions.selectEnvironment(environment.id));
    dispatch(environmentActions.startEditing(environment.id));
  }, [isDragging, dispatch]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'h-9 flex items-center gap-2 px-3 py-1.5 hover:bg-muted box-border group cursor-pointer outline-none',
        {
          'bg-muted': isSelected,
          'opacity-50 shadow-lg z-50': isDragging,
        },
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: environment.color }} />
      <span className="flex-1 text-xs truncate">{environment.title}</span>
      <TrashIcon
        className="size-3 shrink-0 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 cursor-pointer"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          dispatch(environmentActions.setEnvironmentToDelete(environment.id));
        }}
      />
    </div>
  );
}
