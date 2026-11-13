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
      {divider && <div className="my-1 border-t border-border" role="separator" />}
      <button
        className={cn(
          'w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary-hover focus-visible:bg-secondary-hover outline-none border-none bg-transparent cursor-pointer',
          {
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
