import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import useVariableAutocomplete from '../../hooks/useVariableAutocomplete';
import VariableHighlighter from '../highlighters/VariableHighlighter';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  highlightColor?: string;
  suggestVariables?: boolean;
  variables?: string[];
}

export default function HighlightedInput({
  className,
  highlightColor,
  suggestVariables = true,
  variables,
  value,
  onBlur,
  onKeyDown,
  onScroll,
  onSelect,
  ...otherProps
}: Props) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scrollValue, setScrollValue] = useState<number>(0);

  const textValue = typeof value === 'string' ? value : '';

  const { fieldProps, menu, reposition } = useVariableAutocomplete(
    inputRef,
    { onBlur, onKeyDown, onSelect },
    suggestVariables,
  );

  useEffect(() => {
    if (highlighterRef.current) highlighterRef.current.scrollLeft = scrollValue;
  }, [scrollValue]);

  return (
    <div
      className={twMerge('relative leading-0 text-foreground bg-background border border-border rounded', className)}
    >
      <input
        className="relative w-full m-0 py-2 px-3 font-monospace text-xs text-transparent placeholder:text-muted-foreground bg-transparent border-none caret-foreground box-border outline-none z-1"
        ref={inputRef}
        value={value}
        onScroll={(event) => {
          setScrollValue(event.currentTarget.scrollLeft);
          reposition();
          onScroll?.(event);
        }}
        {...otherProps}
        {...fieldProps}
      />
      <div
        className="absolute inset-0 flex items-center mx-3 py-2 font-monospace text-xs whitespace-pre overflow-x-auto scrollbar-none"
        ref={highlighterRef}
      >
        <VariableHighlighter text={textValue} highlightColor={highlightColor} variables={variables} />
      </div>
      {menu}
    </div>
  );
}
