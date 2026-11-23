import { KeyboardEvent, SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu } from 'src/features/context-menu';
import ContextMenuItem from 'src/features/context-menu/ContextMenuItem';

import MoreIcon from 'src/assets/icons/more-icon.svg';

// Gap between the "..." button and the menu below it
const MENU_OFFSET = 4;

export interface RowAction {
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Shows a separator above this action. */
  divider?: boolean;
  onClick: () => void;
}

interface Props {
  actions: RowAction[];
}

/**
 * The "..." button of a sidebar row and its dropdown menu of actions (like Postman). The menu is portaled to the body,
 * but React events still bubble through the React tree: they are stopped here, so a click / key press in the menu
 * doesn't also select / expand / start dragging the row it belongs to.
 */
export default function RowActionsMenu({ actions }: Props) {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Whether the menu was open when the button was pressed: the menu's click-outside closes it on mousedown, and the
  // click that follows must then not open it again
  const wasOpenOnMouseDown = useRef(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isOpen = position !== null;

  const close = useCallback(() => setPosition(null), []);

  const handleButtonClick = () => {
    if (isOpen || wasOpenOnMouseDown.current) {
      wasOpenOnMouseDown.current = false;
      close();
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ x: rect.left, y: rect.bottom + MENU_OFFSET });
  };

  // The ContextMenu's Escape listener is on the document, which events stopped here never reach
  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') close();
  };

  // Like the global context menu: the position would be stale after a scroll / resize
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [isOpen, close]);

  return (
    <span className="contents" onClick={stopPropagation} onKeyDown={handleKeyDown} onPointerDown={stopPropagation}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('common.moreActions')}
        className="flex items-center justify-center size-4 p-0 bg-transparent text-muted-foreground hover:text-foreground border-none rounded cursor-pointer outline-none"
        ref={buttonRef}
        title={t('common.moreActions')}
        type="button"
        onClick={handleButtonClick}
        onMouseDown={() => (wasOpenOnMouseDown.current = isOpen)}
      >
        <MoreIcon className="size-4" />
      </button>

      <ContextMenu isOpen={isOpen} position={position ?? { x: 0, y: 0 }} onClose={close}>
        {actions.map(({ label, destructive, disabled, divider, onClick }) => (
          <ContextMenuItem
            key={label}
            destructive={destructive}
            disabled={disabled}
            divider={divider}
            label={label}
            onClick={() => {
              close();
              onClick();
            }}
          />
        ))}
      </ContextMenu>
    </span>
  );
}

function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}
