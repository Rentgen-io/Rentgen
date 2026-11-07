import { useEffect, useRef, useState } from 'react';
import AutosizeTextarea, { TextareaAutosizeProps } from 'react-textarea-autosize';
import { twMerge } from 'tailwind-merge';
import VariableHighlighter from '../highlighters/VariableHighlighter';

const DEFAULT_HIGHLIGHT_COLOR = '#6B7280';

interface Props extends TextareaAutosizeProps {
  highlightColor?: string;
  highlightJson?: boolean;
  variables?: string[];
}

export default function HighlightedTextarea({
  className,
  highlightColor,
  highlightJson,
  variables,
  value,
  onScroll,
  ...otherProps
}: Props) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const [scrollValue, setScrollValue] = useState<{ scrollTop: number; scrollLeft: number }>({
    scrollTop: 0,
    scrollLeft: 0,
  });
  const textValue = typeof value === 'string' ? value : '';

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
      <AutosizeTextarea
        className="relative w-full min-h-28 m-0 py-2 px-3 font-monospace text-xs text-transparent placeholder:text-muted-foreground bg-transparent border-none caret-foreground box-border resize-y scrollbar-gutter-stable outline-none z-1"
        value={value}
        onScroll={(event) => {
          setScrollValue({ scrollLeft: event.currentTarget.scrollLeft, scrollTop: event.currentTarget.scrollTop });
          onScroll?.(event);
        }}
        {...otherProps}
      />
      <div
        className="absolute inset-0 mx-3 mb-2 pt-2 font-monospace text-xs wrap-break-word whitespace-pre-wrap overflow-hidden scrollbar-gutter-stable"
        ref={highlighterRef}
      >
        <VariableHighlighter
          highlightColor={highlightColor || DEFAULT_HIGHLIGHT_COLOR}
          highlightJson={highlightJson}
          text={textValue + '\u200B'} // ensure trailing newlines are rendered
          variables={variables}
        />
      </div>
    </div>
  );
}
