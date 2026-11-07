import cn from 'classnames';
import { memo, ReactNode, useMemo } from 'react';

export const MAX_JSON_HIGHLIGHT_LENGTH = 100_000;

const tokenColorMap: Record<string, string> = {
  key: 'text-token-key',
  string: 'text-token-string',
  number: 'text-token-number',
  literal: 'text-token-literal',
  punctuation: 'text-token-punctuation',
};

interface TextSegment {
  text: string;
  isVariable: boolean;
}

interface JsonToken {
  text: string;
  kind?: 'key' | 'string' | 'number' | 'literal' | 'punctuation';
}

interface Props {
  highlightColor: string;
  highlightJson?: boolean;
  text: string;
  variables?: string[];
}

export default memo(function VariableHighlighter({ highlightColor, highlightJson, variables = [], text }: Props) {
  const variableKeys = useMemo(() => new Set(variables.map((variable) => variable.trim())), [variables]);

  return useMemo(() => {
    const renderVariables = (value: string): ReactNode =>
      parseVariables(value).map((segment, index) =>
        segment.isVariable && variableKeys.has(segment.text.slice(2, -2).trim()) ? (
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
      );

    const tokens = highlightJson ? tokenizeJson(text) : null;
    if (!tokens) return <>{renderVariables(text)}</>;

    return (
      <>
        {tokens.map((token, index) => (
          <span key={index} className={cn(tokenColorMap[token.kind ?? ''])}>
            {token.text.includes('{{') ? renderVariables(token.text) : token.text}
          </span>
        ))}
      </>
    );
  }, [highlightColor, highlightJson, text, variableKeys]);
});

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

export function shouldHighlightJson(text: string, contentType: string): boolean {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mime) return mime === 'application/json' || mime.endsWith('+json');

  const value = text.trim();
  return /^[{[]/.test(value) || /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:[^"\\]|\\.)*")$/.test(value);
}

export function tokenizeJson(text: string): JsonToken[] | null {
  if (text.length > MAX_JSON_HIGHLIGHT_LENGTH) return null;

  const pattern =
    /\{\{[^}]*}}|"(?:[^"\\]|\\[\s\S])*(?:"|$)|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],:]/g;
  const tokens: JsonToken[] = [];
  let end = 0;

  for (const match of text.matchAll(pattern)) {
    if (tokens.length >= 8_000) return null;
    if (match.index > end) tokens.push({ text: text.slice(end, match.index) });

    const value = match[0];
    end = match.index + value.length;
    let kind: JsonToken['kind'];

    if (value.startsWith('{{')) kind = undefined;
    else if (value.startsWith('"')) {
      let next = end;

      while (next < text.length && /\s/.test(text[next])) next++;
      kind = text[next] === ':' ? 'key' : 'string';
    } else if (/^-?\d/.test(value)) kind = 'number';
    else if (/^[a-z]/.test(value)) kind = 'literal';
    else kind = 'punctuation';

    tokens.push({ text: value, kind });
  }

  if (end < text.length) tokens.push({ text: text.slice(end) });

  return tokens;
}
