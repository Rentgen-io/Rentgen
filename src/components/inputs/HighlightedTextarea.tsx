import { TextareaHTMLAttributes, UIEvent, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import useVariableAutocomplete from '../../hooks/useVariableAutocomplete';
import VariableHighlighter from '../highlighters/VariableHighlighter';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  height?: number | null;
  highlightColor?: string;
  highlightJson?: boolean;
  suggestVariables?: boolean;
  value?: string | readonly string[] | number | undefined;
  variables?: string[];
}

export default function HighlightedTextarea({
  className,
  height,
  highlightColor,
  highlightJson,
  style,
  suggestVariables = true,
  value,
  variables,
  onBlur,
  onKeyDown,
  onScroll,
  onSelect,
  ...otherProps
}: Props) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollValue, setScrollValue] = useState<{ scrollTop: number; scrollLeft: number }>({
    scrollTop: 0,
    scrollLeft: 0,
  });

  const textValue = typeof value === 'string' ? value : '';
  const isFixedHeight = height != null;

  const { fieldProps, menu, reposition } = useVariableAutocomplete(
    textareaRef,
    { onBlur, onKeyDown, onSelect },
    suggestVariables,
  );

  useEffect(() => setScrollValue({ scrollLeft: 0, scrollTop: 0 }), [isFixedHeight]);

  useEffect(() => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = scrollValue.scrollTop;
      highlighterRef.current.scrollLeft = scrollValue.scrollLeft;
    }
  }, [scrollValue]);

  return (
    <div
      className={twMerge('relative leading-0 text-foreground bg-background border border-border rounded', className)}
    >
      <textarea
        className="relative w-full min-h-28 m-0 py-2 px-3 font-monospace text-xs text-transparent placeholder:text-muted-foreground bg-transparent border-none caret-foreground box-border resize-none scrollbar-gutter-stable outline-none z-1"
        style={{ ...style, ...(height != null ? { height } : {}) }}
        ref={textareaRef}
        value={value}
        onScroll={(event: UIEvent<HTMLTextAreaElement>) => {
          setScrollValue({ scrollLeft: event.currentTarget.scrollLeft, scrollTop: event.currentTarget.scrollTop });
          reposition();
          onScroll?.(event);
        }}
        {...otherProps}
        {...fieldProps}
      />
      <div
        className="absolute inset-0 mx-3 mb-2 pt-2 font-monospace text-xs wrap-break-word whitespace-pre-wrap overflow-hidden scrollbar-gutter-stable"
        ref={highlighterRef}
      >
        <VariableHighlighter
          highlightColor={highlightColor}
          highlightJson={highlightJson}
          text={textValue + '​'} // ensure trailing newlines are rendered
          variables={variables}
        />
      </div>
      {menu}
    </div>
  );
}
