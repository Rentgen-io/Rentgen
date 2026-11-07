import cn from 'classnames';
import { MouseEvent } from 'react';

interface Props {
  label: string;
  disabled?: boolean;
  divider?: boolean;
  title?: string;
  onClick: (event: MouseEvent) => void;
}

export default function ContextMenuItem({ label, disabled = false, divider = false, title, onClick }: Props) {
  return (
    <>
      {divider && <div className="my-1 border-t border-border" />}
      <button
        type="button"
        className={cn(
          'w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary-hover border-none bg-transparent cursor-pointer',
          {
            'opacity-50 hover:bg-transparent cursor-not-allowed': disabled,
          },
        )}
        onClick={(event: MouseEvent) => !disabled && onClick(event)}
        disabled={disabled}
        title={title}
      >
        {label}
      </button>
    </>
  );
}
