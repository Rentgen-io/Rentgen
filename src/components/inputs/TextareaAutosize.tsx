import cn from 'classnames';
import AutosizeTextarea, { TextareaAutosizeProps } from 'react-textarea-autosize';
import { twMerge } from 'tailwind-merge';

export default function TextareaAutosize({ className, disabled, ...otherProps }: TextareaAutosizeProps) {
  return (
    <AutosizeTextarea
      className={twMerge(
        cn(
          { 'opacity-50': disabled },
          'min-h-28 m-0 py-2 px-3 font-monospace text-xs text-foreground placeholder:text-muted-foreground bg-background border border-border rounded box-border resize-y outline-none',
          className,
        ),
      )}
      disabled={disabled}
      {...otherProps}
    />
  );
}
