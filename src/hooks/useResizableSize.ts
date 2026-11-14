import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from 'react';

const KEYBOARD_STEP = 20;

/** In pixels, or as a share of the window size, e.g. `'80vh'` or `'50vw'` */
export type ResizableSizeLimit = number | `${number}vh` | `${number}vw`;

interface Options {
  /** Which dimension of the element the handle resizes */
  dimension: 'height' | 'width';
  /** Upper bound of the size; unbounded when omitted */
  maxSize?: ResizableSizeLimit;
  /** Lower bound of the size, in pixels; wins over `maxSize` in a window too small for both */
  minSize: number;
  /** localStorage key the chosen size is remembered under */
  storageKey: string;
}

interface DragState {
  size: number | null;
  startPosition: number;
  startSize: number;
}

const DIMENSIONS = {
  height: {
    // Styled in index.css: keeps the resize cursor and blocks text selection everywhere while dragging
    bodyClass: 'is-resizing-row',
    getPosition: (event: PointerEvent) => event.clientY,
    getSize: (element: HTMLElement) => element.offsetHeight,
    keySteps: { ArrowDown: KEYBOARD_STEP, ArrowUp: -KEYBOARD_STEP } as Record<string, number>,
    // The handle of a height is a horizontal line along the bottom edge
    orientation: 'horizontal',
  },
  width: {
    bodyClass: 'is-resizing-col',
    getPosition: (event: PointerEvent) => event.clientX,
    getSize: (element: HTMLElement) => element.offsetWidth,
    keySteps: { ArrowLeft: -KEYBOARD_STEP, ArrowRight: KEYBOARD_STEP } as Record<string, number>,
    // The handle of a width is a vertical line along the right edge
    orientation: 'vertical',
  },
} as const;

function readStoredSize(storageKey: string): number | null {
  try {
    const value = Number(localStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeSize(storageKey: string, size: number | null) {
  try {
    if (size === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, String(size));
  } catch {
    // Storage unavailable: the size just isn't remembered
  }
}

function resolveLimit(limit: ResizableSizeLimit | undefined, viewport: { height: number; width: number }): number {
  if (limit === undefined) return Infinity;
  if (typeof limit === 'number') return limit;
  return (parseFloat(limit) / 100) * (limit.endsWith('vh') ? viewport.height : viewport.width);
}

const getViewport = () => ({ height: window.innerHeight, width: window.innerWidth });

/**
 * Lets the user resize an element's height or width by dragging a handle placed on its bottom / right edge.
 *
 * Until the handle is first used, `size` is `null` and the element keeps its natural (CSS / content-driven) size.
 * Dragging (or the arrow keys on the focused handle) fixes the size, which is remembered across app restarts.
 * Double-clicking the handle goes back to the natural size.
 *
 * The returned `size` always fits within the bounds. A window-relative max follows window resizes without touching
 * the remembered size, so the element gets its preferred size back once the window is large enough again.
 *
 * Attach `targetRef` to the resized element (used to measure the natural size a drag starts from), apply `size` to
 * it, and spread `handleProps` onto a `ResizeHandler`.
 */
export function useResizableSize<T extends HTMLElement>({ dimension, maxSize, minSize, storageKey }: Options) {
  const { bodyClass, getPosition, getSize, keySteps, orientation } = DIMENSIONS[dimension];

  const [storedSize, setStoredSize] = useState<number | null>(() => readStoredSize(storageKey));
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [viewport, setViewport] = useState(getViewport);

  const targetRef = useRef<T>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    document.body.classList.add(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [bodyClass, isResizing]);

  const isViewportRelative = typeof maxSize === 'string';

  useEffect(() => {
    if (!isViewportRelative) return;

    const onResize = () => setViewport(getViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isViewportRelative]);

  const maxSizePx = resolveLimit(maxSize, viewport);
  const clamp = (value: number) => Math.round(Math.max(minSize, Math.min(maxSizePx, value)));

  const size = storedSize === null ? null : clamp(storedSize);
  const getCurrentSize = () => size ?? (targetRef.current ? getSize(targetRef.current) : minSize);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    dragRef.current = { size: null, startPosition: getPosition(event), startSize: getCurrentSize() };
    setIsResizing(true);

    try {
      // Keeps the moves coming to the handle while the cursor leaves it
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer no longer active: the drag still works over the handle and ends on the next release / move
    }
  };

  // Wired to pointerup, pointercancel and lostpointercapture: whichever comes first ends the drag
  const endResize = () => {
    const drag = dragRef.current;
    if (!drag) return;

    dragRef.current = null;
    setIsResizing(false);

    // A plain click (no movement) must not switch from the natural size to a fixed one
    if (drag.size !== null) storeSize(storageKey, drag.size);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    // The button was released without us seeing it (e.g. capture wasn't granted): finish, don't resize on hover
    if ((event.buttons & 1) === 0) return endResize();

    drag.size = clamp(drag.startSize + getPosition(event) - drag.startPosition);
    setStoredSize(drag.size);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = keySteps[event.key];
    if (!step) return;

    event.preventDefault();
    const nextSize = clamp(getCurrentSize() + step);
    setStoredSize(nextSize);
    storeSize(storageKey, nextSize);
  };

  const onDoubleClick = () => {
    setStoredSize(null);
    storeSize(storageKey, null);
  };

  return {
    size,
    targetRef,
    handleProps: {
      'aria-valuemax': Number.isFinite(maxSizePx) ? Math.round(maxSizePx) : undefined,
      'aria-valuemin': minSize,
      'aria-valuenow': size ?? undefined,
      isResizing,
      orientation,
      onDoubleClick,
      onKeyDown,
      onLostPointerCapture: endResize,
      onPointerCancel: endResize,
      onPointerDown,
      onPointerMove,
      onPointerUp: endResize,
    },
  };
}
