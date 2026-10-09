import cn from 'classnames';
import { HTMLAttributes, useEffect } from 'react';
import useClickOutside from 'src/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';

export interface Props extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Modal({ className, children, isOpen, onClose }: Props) {
  const refModal = useClickOutside<HTMLDivElement>(onClose);

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const { style } = html;
    const previousOverflow = style.overflow;

    style.overflow = 'hidden';

    return () => {
      style.overflow = previousOverflow;

      if (!style.length) html.removeAttribute('style');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={twMerge(
        cn('fixed inset-0 flex items-center justify-center bg-black/40 z-100', 'dark:bg-dark-input/80', className),
      )}
    >
      <div
        ref={refModal}
        className={cn(
          'relative w-150 max-w-[90%] m-5 p-5 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
          'dark:bg-dark-body',
        )}
      >
        {children}
      </div>
    </div>
  );
}
