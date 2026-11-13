import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ResponsePanelContext } from 'src/types';
import ContextMenu from './ContextMenu';
import GlobalContextMenuItems, { isTextField } from './GlobalContextMenuItems';

interface MenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  selectedText: string;
}

interface ContextMenuValue {
  isOpen: boolean;
  showContextMenu: (x: number, y: number, text: string, responsePanelContext?: ResponsePanelContext) => void;
}

const ContextMenuContext = createContext<ContextMenuValue | null>(null);

export function useContextMenu(): ContextMenuValue {
  const contextMenu = useContext(ContextMenuContext);
  if (!contextMenu) throw new Error('useContextMenu must be used within GlobalContextMenuProvider');

  return contextMenu;
}

/**
 * Only menu state lives here (no store subscriptions), and the context value only changes when the menu opens / closes,
 * so its many consumers (sidebar rows, useClickOutside users, JSON viewers) don't re-render on unrelated changes.
 */
export default function GlobalContextMenuProvider({ children }: PropsWithChildren) {
  const [htmlElement, setHtmlElement] = useState<HTMLElement | null>(null);
  const [menuState, setMenuState] = useState<MenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    selectedText: '',
  });
  const [responsePanelContext, setResponsePanelContext] = useState<ResponsePanelContext | null>(null);

  // Runs on every scroll anywhere (capture listener below): a no-op when already closed, so it doesn't re-render then.
  // Also drops the element / response context, so no reference to a possibly removed element is kept
  const closeMenu = useCallback(() => {
    setMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    setHtmlElement(null);
    setResponsePanelContext(null);
  }, []);

  const showContextMenu = useCallback((x: number, y: number, text: string, panelContext?: ResponsePanelContext) => {
    setHtmlElement(null);
    setResponsePanelContext(panelContext || null);
    setMenuState({
      isOpen: true,
      position: { x, y },
      selectedText: text,
    });
  }, []);

  const contextValue = useMemo(
    () => ({ isOpen: menuState.isOpen, showContextMenu }),
    [menuState.isOpen, showContextMenu],
  );

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const selectedText = getSelectedText();

      if (!selectedText.trim() && !isTextField(target)) return;

      event.preventDefault();
      setHtmlElement(target);
      // The response viewer opens the menu through showContextMenu instead: a plain right-click must not keep its
      // context, or "Set as variable" would show up here with the JSON path of an earlier right-click
      setResponsePanelContext(null);
      setMenuState({
        isOpen: true,
        position: { x: event.clientX, y: event.clientY },
        selectedText,
      });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('scroll', closeMenu, { passive: true, capture: true });
    // Like native menus: close when the app window loses focus or is resized (the position would be stale)
    window.addEventListener('blur', closeMenu);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      // Must match the capture flag it was added with, otherwise the listener is not removed
      document.removeEventListener('scroll', closeMenu, { capture: true });
      window.removeEventListener('blur', closeMenu);
      window.removeEventListener('resize', closeMenu);
    };
  }, [closeMenu]);

  return (
    <ContextMenuContext.Provider value={contextValue}>
      {children}
      <ContextMenu isOpen={menuState.isOpen} position={menuState.position} onClose={closeMenu}>
        <GlobalContextMenuItems
          htmlElement={htmlElement}
          responsePanelContext={responsePanelContext}
          selectedText={menuState.selectedText}
          onClose={closeMenu}
        />
      </ContextMenu>
    </ContextMenuContext.Provider>
  );
}

/** The selected text as it is (not trimmed: copying must keep whitespace like indentation). */
function getSelectedText() {
  return window.getSelection()?.toString() ?? '';
}
