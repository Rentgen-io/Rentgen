import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import VariableHighlighter from '../highlighters/VariableHighlighter';

const DEFAULT_HIGHLIGHT_COLOR = '#6B7280';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  highlightColor?: string;
  variables?: string[];
}

export default function HighlightedInput({
  className,
  highlightColor,
  variables,
  value,
  onScroll,
  ...otherProps
}: Props) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const [scrollValue, setScrollValue] = useState<number>(0);
  const textValue = typeof value === 'string' ? value : '';

  useEffect(() => {
    if (highlighterRef.current) highlighterRef.current.scrollLeft = scrollValue;
  }, [scrollValue]);

  return (
    <div
      className={twMerge('relative leading-0 text-foreground bg-background border border-border rounded', className)}
    >
      <input
        className="relative w-full m-0 py-2 px-3 font-monospace text-xs text-transparent placeholder:text-muted-foreground bg-transparent border-none caret-foreground box-border outline-none z-1"
        value={value}
        onScroll={(event) => {
          setScrollValue(event.currentTarget.scrollLeft);
          onScroll?.(event);
        }}
        {...otherProps}
      />
      <div
        className="absolute inset-0 flex items-center mx-3 py-2 font-monospace text-xs whitespace-pre overflow-x-auto scrollbar-none"
        ref={highlighterRef}
      >
        <VariableHighlighter
          text={textValue}
          highlightColor={highlightColor || DEFAULT_HIGHLIGHT_COLOR}
          variables={variables}
        />
      </div>
    </div>
  );
}
