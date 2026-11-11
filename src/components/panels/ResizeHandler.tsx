import cn from 'classnames';
import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends HTMLAttributes<HTMLDivElement> {
  isResizing?: boolean;
  /** `horizontal`: a line along the bottom edge (resizes a height), `vertical`: along the right edge (a width) */
  orientation?: 'horizontal' | 'vertical';
}

// While dragging, index.css applies the cursor to the whole page (.is-resizing-row / -col): keep both in sync
const ORIENTATION_CLASSES = {
  horizontal: {
    handle: 'inset-x-0 -bottom-1 h-2 cursor-ns-resize',
    line: 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2',
  },
  vertical: {
    handle: 'inset-y-0 -right-1 w-2 cursor-ew-resize',
    line: 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2',
  },
};

/**
 * Drag handle sitting on the bottom or right edge of its `relative` (or otherwise positioned) parent, meant to be
 * driven by `useResizableSize`. The hit area overlaps the border line; the line itself is highlighted on hover / drag.
 */
export default function ResizeHandler({ className, isResizing, orientation = 'horizontal', ...otherProps }: Props) {
  const classes = ORIENTATION_CLASSES[orientation];

  return (
    <div
      aria-orientation={orientation}
      className={twMerge('group absolute z-10 outline-none touch-none', classes.handle, className)}
      role="separator"
      tabIndex={0}
      {...otherProps}
    >
      <div
        className={cn('absolute bg-primary transition-opacity', classes.line, {
          'opacity-100': isResizing,
          'opacity-0 group-hover:opacity-100 group-hover:delay-150 group-focus-visible:opacity-100': !isResizing,
        })}
      />
    </div>
  );
}
