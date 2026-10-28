import { useCallback, useLayoutEffect, useState } from 'react';

export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number>(0);
  const [node, setNode] = useState<T | null>(null);

  const ref = useCallback((el: T | null) => setNode(el), []);

  useLayoutEffect(() => {
    if (!node) {
      setHeight(0);
      return;
    }

    setHeight(node.offsetHeight);

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [ref, height] as const;
}
