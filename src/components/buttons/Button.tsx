import cn from 'classnames';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum ButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SECONDARY_OUTLINE = 'secondary-outline',
  DANGER = 'danger',
}

export interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  buttonSize?: ButtonSize;
  buttonType?: ButtonType;
}

export default function Button({
  buttonSize = ButtonSize.MEDIUM,
  buttonType = ButtonType.PRIMARY,
  children,
  className,
  disabled,
  type = 'button',
  ...otherProps
}: Props) {
  return (
    <button
      className={twMerge(
        cn(
          'm-0 font-segoe-ui text-xs font-medium border rounded',
          {
            'py-0.5 px-2': buttonSize === ButtonSize.SMALL,
            'min-w-20 py-2 px-3': buttonSize === ButtonSize.MEDIUM,
            'bg-primary border-primary text-white': buttonType === ButtonType.PRIMARY,
            'hover:bg-primary-hover hover:border-primary-hover': buttonType === ButtonType.PRIMARY && !disabled,
            'bg-secondary border-secondary text-foreground dark:text-white': buttonType === ButtonType.SECONDARY,
            'hover:bg-secondary-hover hover:border-secondary-hover': buttonType === ButtonType.SECONDARY && !disabled,
            'bg-transparent border-foreground/20 text-foreground': buttonType === ButtonType.SECONDARY_OUTLINE,
            'hover:border-foreground/40': buttonType === ButtonType.SECONDARY_OUTLINE && !disabled,
            'bg-destructive border-destructive text-white': buttonType === ButtonType.DANGER,
            'hover:bg-destructive-hover hover:border-destructive-hover': buttonType === ButtonType.DANGER && !disabled,
            'opacity-50 cursor-not-allowed': disabled,
            'cursor-pointer': !disabled,
          },
          className,
        ),
      )}
      disabled={disabled}
      type={type}
      {...otherProps}
    >
      {children}
    </button>
  );
}
