import cn from 'classnames';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export default function SidebarButton({ children, className, label, onClick, ...otherProps }: Props) {
  return (
    <button
      type="button"
      title={label}
      className={twMerge(
        cn(
          'sidebar-nav-button w-full border-0 bg-transparent font-segoe-ui py-3 px-1 flex flex-col items-center gap-1 cursor-pointer text-center',
          'text-button-text-secondary hover:bg-button-secondary hover:text-button-text-secondary-hover',
          'dark:text-dark-text dark:hover:bg-dark-input dark:hover:text-dark-text',
          className,
        ),
      )}
      onClick={onClick}
      {...otherProps}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
