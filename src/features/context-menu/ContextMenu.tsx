import cn from 'classnames';
import { KeyboardEvent, PropsWithChildren, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useClickOutside from 'src/hooks/useClickOutside';

// Minimal distance between the menu and the viewport edges
const VIEWPORT_PADDING = 8;
// Items that can be focused with the keyboard (disabled ones are skipped)
const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

interface Props extends PropsWithChildren {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ children, isOpen, position, onClose }: Props) {
  const menuRef = useClickOutside<HTMLDivElement>(onClose, true);
  const [isVisible, setIsVisible] = useState(false);

  // Delay to allow DOM mount before triggering CSS transition
  useEffect(() => {
    const visibilityTimeout = setTimeout(() => setIsVisible(isOpen));
    return () => clearTimeout(visibilityTimeout);
  }, [isOpen]);

  // Keeps the menu within the viewport, using its real size (it depends on the items shown). A layout effect, so it's
  // positioned before the browser paints and never jumps
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!isOpen || !menu) return;

    const { width, height } = menu.getBoundingClientRect();

    menu.style.left = `${clamp(position.x, window.innerWidth - width - VIEWPORT_PADDING)}px`;
    menu.style.top = `${clamp(position.y, window.innerHeight - height - VIEWPORT_PADDING)}px`;
  }, [isOpen, position]);

  // Gives focus back when the menu closes, e.g. to the field it was opened on. Not when the user meanwhile focused
  // something else (clicked outside)
  useEffect(() => {
    if (!isOpen) return;

    const menu = menuRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      if (document.activeElement === document.body || menu?.contains(document.activeElement))
        previouslyFocused?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Moves focus into the menu itself (no item selected yet, like native menus: the first ↓ selects the first item), so
  // the arrow keys reach handleKeyDown. Only once visible: the menu is first rendered with `visibility: hidden` (see
  // isVisible), and a hidden element can't receive focus
  useEffect(() => {
    if (isOpen && isVisible) menuRef.current?.focus({ preventScroll: true });
  }, [isOpen, isVisible]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      onClose();
      return;
    }

    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = {
      ArrowDown: index < 0 ? 0 : (index + 1) % items.length,
      ArrowUp: index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];

    if (nextIndex === undefined || items.length === 0) return;

    event.preventDefault();
    items[nextIndex].focus();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={cn('fixed flex flex-col py-1 min-w-40 bg-background rounded shadow-default outline-none', {
        'invisible opacity-0 -z-100': !isVisible,
        'visible opacity-100 z-100': isVisible,
      })}
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
}

function clamp(value: number, max: number): number {
  return Math.max(VIEWPORT_PADDING, Math.min(value, max));
}
