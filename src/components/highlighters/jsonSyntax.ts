// Bound both scanning work and the number of DOM nodes created while typing.
export const MAX_JSON_HIGHLIGHT_LENGTH = 100_000;
const MAX_TOKENS = 8_000;

export interface JsonToken {
  text: string;
  kind?: 'key' | 'string' | 'number' | 'literal' | 'punctuation';
}

export function shouldHighlightJson(text: string, contentType: string): boolean {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mime) return mime === 'application/json' || mime.endsWith('+json');
  // Sniff containers even while incomplete; also recognize complete JSON primitives.
  const value = text.trim();
  return /^[{[]/.test(value) || /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:[^"\\]|\\.)*")$/.test(value);
}

export function tokenizeJson(text: string): JsonToken[] | null {
  if (text.length > MAX_JSON_HIGHLIGHT_LENGTH) return null;
  // Variables take priority over JSON punctuation. Incomplete strings remain colored while editing.
  const pattern = /\{\{[^}]*}}|"(?:[^"\\]|\\[\s\S])*(?:"|$)|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],:]/g;
  const tokens: JsonToken[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (tokens.length >= MAX_TOKENS) return null;
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
