import { HTMLAttributes } from 'react';
import useClickOutside from 'src/hooks/useClickOutside';
import { twMerge } from 'tailwind-merge';

export interface Props extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Modal({ className, children, isOpen, onClose }: Props) {
  const refModal = useClickOutside<HTMLDivElement>(onClose);

  if (!isOpen) return null;

  return (
    <div className={twMerge('fixed inset-0 flex items-center justify-center bg-[rgb(26,26,26)]/60 z-100', className)}>
      <div ref={refModal} className="relative w-150 max-w-[90%] m-4 p-4 bg-background rounded shadow-default">
        {children}
      </div>
    </div>
  );
}
