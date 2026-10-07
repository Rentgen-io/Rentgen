import { useMemo } from 'react';

interface TextSegment {
  text: string;
  isVariable: boolean;
}

interface Props {
  highlightColor: string;
  variables?: string[];
  text: string;
}

export default function VariableHighlighter({ highlightColor, variables = [], text }: Props) {
  const segments = useMemo(() => parseVariables(text), [text]);
  const variableKeys = useMemo(() => new Set(variables.map((variable) => variable.trim())), [variables]);
  const variableExists = (segmentText: string): boolean => {
    const varName = segmentText.slice(2, -2).trim();
    return variableKeys.has(varName);
  };

  return (
    <>
      {segments.map((segment, index) =>
        segment.isVariable && variableExists(segment.text) ? (
          <span
            key={index}
            style={{
              color: highlightColor,
              backgroundColor: `${highlightColor}20`,
              borderRadius: '2px',
            }}
          >
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function parseVariables(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  const regex = /\{\{([^}]+)}}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isVariable: false,
      });
    }

    segments.push({
      text: match[0],
      isVariable: true,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isVariable: false,
    });
  }

  return segments;
}
