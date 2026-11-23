import cn from 'classnames';
import { MouseEvent } from 'react';

interface Props {
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
  title?: string;
  onClick: (event: MouseEvent) => void;
}

export default function ContextMenuItem({
  label,
  destructive = false,
  disabled = false,
  divider = false,
  title,
  onClick,
}: Props) {
  return (
    <>
      {divider && <div className="my-1 border-t border-border" role="separator" />}
      <button
        className={cn(
          'w-full px-3 py-1.5 text-left text-xs hover:bg-accent-soft focus-visible:bg-accent-soft outline-none border-none bg-transparent cursor-pointer',
          {
            'text-foreground': !destructive,
            'text-destructive': destructive,
            'opacity-50 hover:bg-transparent cursor-not-allowed': disabled,
          },
        )}
        disabled={disabled}
        role="menuitem"
        tabIndex={-1}
        title={title}
        type="button"
        onClick={onClick}
      >
        {label}
      </button>
    </>
  );
}
