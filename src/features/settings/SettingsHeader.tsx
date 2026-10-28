import cn from 'classnames';
import { HTMLAttributes, PropsWithChildren } from 'react';

export default function SettingsHeader({
  className,
  children,
  ...otherProps
}: HTMLAttributes<HTMLHeadingElement> & PropsWithChildren) {
  return (
    <h5
      className={cn(
        'flex items-center justify-between gap-4 m-0 pb-1.5 border-b border-b-border dark:border-b-dark-border',
        className,
      )}
      {...otherProps}
    >
      {children}
    </h5>
  );
}
