import cn from 'classnames';
import Button, { Props as ButtonProps, ButtonType } from './Button';

export function IconButton({ buttonType = ButtonType.SECONDARY, className, children, ...otherProps }: ButtonProps) {
  return (
    <Button
      buttonType={buttonType}
      className={cn('flex items-center justify-center size-8.5 min-w-auto p-0', className)}
      {...otherProps}
    >
      {children}
    </Button>
  );
}
