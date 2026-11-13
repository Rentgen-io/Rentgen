import { useEffect, useRef } from 'react';
import { useContextMenu } from 'src/features/context-menu';

const useClickOutside = <T extends HTMLElement>(onClickOutside?: () => void, ignoreContextMenu = false) => {
  const { isOpen } = useContextMenu();
  const element = useRef<T>(null);

  // The latest values in a ref, so the listener is added once: callers pass inline callbacks, which would otherwise
  // remove and re-add the document listener on every render
  const latest = useRef({ ignoreContextMenu, isOpen, onClickOutside });

  useEffect(() => {
    latest.current = { ignoreContextMenu, isOpen, onClickOutside };
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const { ignoreContextMenu, isOpen, onClickOutside } = latest.current;

      if (
        (ignoreContextMenu || !isOpen) &&
        onClickOutside &&
        element.current &&
        !element.current.contains(event.target as Node)
      )
        onClickOutside();
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return element;
};

export default useClickOutside;
