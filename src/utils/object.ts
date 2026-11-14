import { isPhoneNumber } from './validation';

export function containsArray(value: unknown): boolean {
  let parsed;

  try {
    parsed = !isObject(value) ? JSON.parse(JSON.stringify(value, null, 2)) : value;
  } catch {
    return false;
  }

  function check(value: any): boolean {
    if (Array.isArray(value)) return true;
    if (value !== null && typeof value === 'object') return Object.values(value).some(check);

    return false;
  }

  return check(parsed);
}

export function detectObjectType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';

  return typeof value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

export function setDeepObjectProperty(targetObject: any, propertyPath: string, newValue: any): void {
  const pathParts = propertyPath.replace(/\[(\d+)\]/g, '.$1').split('.');
  let currentObject = targetObject;

  for (const key of pathParts.slice(0, -1)) {
    if (!(key in currentObject)) currentObject[key] = {};
    currentObject = currentObject[key];
  }

  currentObject[pathParts[pathParts.length - 1]] = newValue;
}

export function stringifyValue(value: any): string {
  if (
    (typeof value === 'string' &&
      (value === 'false' || value === 'true' || (!isNaN(Number(value)) && !isPhoneNumber(String(value))))) ||
    isObject(value)
  )
    return JSON.stringify(value);

  return String(value);
}

export function truncateValue(value: any, maxLength = 100): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const stringValue = typeof value === 'string' ? JSON.stringify(value) : stringifyValue(value);
  if (stringValue.length > maxLength) {
    const truncationSuffix = '...';
    const availableLength = maxLength - truncationSuffix.length;

    return stringValue.slice(0, Math.max(0, availableLength)) + truncationSuffix;
  }

  return stringValue;
}

export function tryParseJsonObject(value: unknown): unknown {
  if (isObject(value)) return value;
  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    if (isObject(parsed)) return parsed;

    return value;
  } catch {
    return value;
  }
}

export function parseJsonObject(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// JSON Pointer (RFC 6901): '' is the whole document, '/a/b~1c' is value.a['b/c'].
const escapeJsonPointerToken = (token: string) => token.replace(/~/g, '~0').replace(/\//g, '~1');
const unescapeJsonPointerToken = (token: string) => token.replace(/~1/g, '/').replace(/~0/g, '~');

export function toJsonPointer(tokens: string[]): string {
  return tokens.map((token) => `/${escapeJsonPointerToken(token)}`).join('');
}

export function parseJsonPointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`Invalid JSON pointer: "${pointer}"`);

  return pointer.slice(1).split('/').map(unescapeJsonPointerToken);
}

export function getByJsonPointer(value: unknown, pointer: string): unknown {
  return parseJsonPointer(pointer).reduce<unknown>(
    (current, token) => (isObject(current) && Object.hasOwn(current, token) ? current[token] : undefined),
    value,
  );
}

/** Returns a copy of `value` with `newValue` at `pointer`. The parent of the target must exist. */
export function setByJsonPointer<T>(value: T, pointer: string, newValue: unknown): T {
  const tokens = parseJsonPointer(pointer);
  if (!tokens.length) return newValue as T;

  const copy = structuredClone(value);
  const parent = getByJsonPointer(copy, toJsonPointer(tokens.slice(0, -1)));

  if (!isObject(parent)) throw new Error(`JSON pointer target does not exist: "${pointer}"`);

  parent[tokens.at(-1)!] = newValue;

  return copy;
}
