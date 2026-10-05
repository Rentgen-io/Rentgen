import cn from 'classnames';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import useClickOutside from '../../hooks/useClickOutside';
import Button, { Props as ButtonProps, ButtonSize, ButtonType } from './Button';

import ChevronIcon from '../../assets/icons/chevron-icon.svg';

export interface Props extends ButtonProps {
  actions?: { label: string; onClick: () => void }[];
}

export default function ActionsButton({
  actions,
  buttonSize = ButtonSize.MEDIUM,
  buttonType = ButtonType.PRIMARY,
  children,
  className,
  ...otherProps
}: Props) {
  const [openActions, setOpenActions] = useState<boolean>(false);
  const refButton = useClickOutside<HTMLDivElement>(() => setOpenActions(false));

  return (
    <div className={twMerge(cn('relative flex', className))} ref={refButton}>
      <Button buttonSize={buttonSize} buttonType={buttonType} {...otherProps}>
        {children}
      </Button>
      {actions && actions.length > 0 && (
        <>
          <Button
            buttonSize={buttonSize}
            buttonType={buttonType}
            className={twMerge(
              cn('min-w-auto flex items-center justify-center', {
                'p-0.5': buttonSize === ButtonSize.SMALL,
                'p-1.5': buttonSize === ButtonSize.MEDIUM,
              }),
            )}
            onClick={() => setOpenActions((prevOpenActions) => !prevOpenActions)}
          >
            <ChevronIcon
              className={cn('rotate-90', {
                'h-4 w-4': buttonSize === ButtonSize.SMALL,
                'h-5 w-5': buttonSize === ButtonSize.MEDIUM,
              })}
            />
          </Button>
          {openActions && (
            <div className="absolute top-full right-0 w-full bg-white dark:bg-dark-input shadow-lg z-50">
              {actions.map(({ label, onClick }, index) => (
                <div
                  key={index}
                  className={cn(
                    'text-xs hover:bg-select-hover dark:hover:bg-dark-button-secondary cursor-pointer',
                    { 'py-2 px-3': buttonSize === ButtonSize.MEDIUM },
                    { 'py-1 px-2': buttonSize === ButtonSize.SMALL },
                  )}
                  onClick={() => {
                    onClick();
                    setOpenActions(false);
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
