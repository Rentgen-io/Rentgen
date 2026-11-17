import { v4 as uuidv4 } from 'uuid';
import {
  PostmanBody,
  PostmanBodyFull,
  PostmanCollection,
  PostmanCollectionFull,
  PostmanFolder,
  PostmanFolderFull,
  PostmanHeader,
  PostmanHeaderFull,
  PostmanItem,
  PostmanItemFull,
  PostmanRequest,
  PostmanRequestFull,
  PostmanUrlObject,
} from '../types/postman';
import { COLLECTION_SCHEMA, DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME } from './collection';
import { generateFolderId, generateRequestId } from './id';

export interface PostmanImportResult {
  collection: PostmanCollection;
  /** Postman features that Rentgen does not support and dropped on import (auth, scripts, variables). */
  warnings: string[];
}

export interface CollectionValidationResult {
  valid: boolean;
  error?: string;
}

/** Folders collected while flattening the nested Postman tree. */
interface FlattenedFolders {
  folders: PostmanFolder[];
  warnings: string[];
}

const DEFAULT_IMPORTED_COLLECTION_NAME = 'Imported Collection';
const FOLDER_PATH_SEPARATOR = ' / ';

// ---------- Export: Rentgen -> Postman ----------

/** Converts a Rentgen collection to the full Postman v2.1 format. */
export function rentgenToPostman(collection: PostmanCollection): PostmanCollectionFull {
  return {
    info: {
      _postman_id: uuidv4(),
      name: collection.info.name,
      description: collection.info.description || '',
      schema: COLLECTION_SCHEMA,
    },
    item: collection.item.map(toPostmanFolder),
  };
}

function toPostmanFolder(folder: PostmanFolder): PostmanFolderFull {
  return {
    name: folder.name,
    _postman_id: folder.id || uuidv4(),
    item: folder.item.map(toPostmanItem),
  };
}

function toPostmanItem(item: PostmanItem): PostmanItemFull {
  return {
    name: item.name,
    _postman_id: item.id || uuidv4(),
    request: toPostmanRequest(item.request),
    response: [],
  };
}

function toPostmanRequest(request: PostmanRequest): PostmanRequestFull {
  return {
    method: request.method,
    url: toPostmanUrl(request.url),
    header: request.header.map(({ key, value }) => ({ key, value, type: 'text', disabled: false })),
    body: request.body ? toPostmanBody(request.body) : undefined,
  };
}

/** Exports the content of the selected body mode; returns `undefined` if the mode has no content */
function toPostmanBody(body: PostmanBody): PostmanBodyFull | undefined {
  if (body.mode === 'raw' && body.raw)
    return { mode: 'raw', raw: body.raw, options: { raw: { language: detectRawLanguage(body.raw) } } };

  if (body.mode === 'urlencoded' && body.urlencoded) return { mode: 'urlencoded', urlencoded: body.urlencoded };

  if (body.mode === 'formdata' && body.formdata) return { mode: 'formdata', formdata: body.formdata };

  return undefined;
}

/** Splits a URL into Postman's URL parts; a URL that can't be parsed (e.g. with `{{variables}}`) is kept raw. */
function toPostmanUrl(rawUrl: string): PostmanUrlObject {
  try {
    const url = new URL(rawUrl);

    return {
      raw: rawUrl,
      protocol: url.protocol.replace(':', ''),
      host: url.hostname.split('.'),
      path: url.pathname.split('/').filter(Boolean),
      query: Array.from(url.searchParams.entries(), ([key, value]) => ({ key, value })),
    };
  } catch {
    return { raw: rawUrl };
  }
}

/** The language Postman uses to highlight a raw body. */
function detectRawLanguage(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';

  return 'text';
}

// ---------- Import: Postman -> Rentgen ----------

/**
 * Converts a Postman collection to the Rentgen format. Nested folders are flattened into "Parent / Child" folders,
 * and requests outside any folder go to the default folder.
 */
export function postmanToRentgen(postmanCollection: PostmanCollectionFull): PostmanImportResult {
  const warnings = getCollectionWarnings(postmanCollection);
  const flattened: FlattenedFolders = { folders: [], warnings: [] };
  const rootRequests: PostmanItem[] = [];

  for (const item of postmanCollection.item) {
    if (isPostmanFolder(item)) flattenFolder(item, '', flattened);
    else if (isPostmanRequest(item)) rootRequests.push(fromPostmanItem(item, flattened.warnings));
  }

  // The default folder holds the root requests, and is kept even when empty so the collection has a folder
  const folders =
    rootRequests.length > 0 || flattened.folders.length === 0
      ? [{ id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME, item: rootRequests }, ...flattened.folders]
      : flattened.folders;

  return {
    collection: {
      info: {
        name: postmanCollection.info.name || DEFAULT_IMPORTED_COLLECTION_NAME,
        description: postmanCollection.info.description || '',
        schema: COLLECTION_SCHEMA,
      },
      item: folders,
    },
    warnings: [...warnings, ...flattened.warnings],
  };
}

function getCollectionWarnings({ auth, variable, event }: PostmanCollectionFull): string[] {
  const warnings: string[] = [];

  if (auth) warnings.push('Collection-level authentication was ignored');
  if (variable?.length) warnings.push(`${variable.length} collection variables were ignored`);
  if (event?.length) warnings.push('Collection-level scripts were ignored');

  return warnings;
}

/**
 * Adds a folder and its subfolders as single-level folders named by their path, e.g. "Users / Admin".
 * Subfolders come before their parent, and a folder without direct requests is not added.
 */
function flattenFolder(folder: PostmanFolderFull, parentPath: string, flattened: FlattenedFolders): void {
  const path = parentPath ? `${parentPath}${FOLDER_PATH_SEPARATOR}${folder.name}` : folder.name;

  if (folder.event?.length) flattened.warnings.push(`Folder "${path}" scripts were ignored`);
  if (folder.auth) flattened.warnings.push(`Folder "${path}" auth was ignored`);

  for (const child of folder.item) if (isPostmanFolder(child)) flattenFolder(child, path, flattened);

  const requests = folder.item.filter(isPostmanRequest);
  if (requests.length > 0)
    flattened.folders.push({
      id: folder._postman_id || generateFolderId(),
      name: path,
      item: requests.map((request) => fromPostmanItem(request, flattened.warnings)),
    });
}

function fromPostmanItem(item: PostmanItemFull, warnings: string[]): PostmanItem {
  if (item.event?.length) warnings.push(`Request "${item.name}" scripts were ignored`);

  return {
    id: item._postman_id || generateRequestId(),
    name: item.name,
    request: fromPostmanRequest(item.request),
  };
}

function fromPostmanRequest(request: PostmanRequestFull): PostmanRequest {
  return {
    method: request.method?.toUpperCase() || 'GET',
    url: fromPostmanUrl(request.url),
    header: fromPostmanHeaders(request.header ?? []),
    body: request.body ? fromPostmanBody(request.body) : undefined,
  };
}

/** Uses the raw URL when present, otherwise rebuilds it from its parts (disabled query parameters are skipped). */
function fromPostmanUrl(url: string | PostmanUrlObject | undefined): string {
  if (!url) return '';
  if (typeof url === 'string') return url;
  if (url.raw) return url.raw;

  const protocol = url.protocol || 'https';
  const host = url.host?.join('.') || 'localhost';
  const path = url.path?.length ? `/${url.path.join('/')}` : '';
  const query = url.query?.length
    ? `?${url.query
        .filter((parameter) => !parameter.disabled)
        .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')}`
    : '';

  return `${protocol}://${host}${path}${query}`;
}

function fromPostmanHeaders(headers: PostmanHeaderFull[]): PostmanHeader[] {
  return headers.filter((header) => !header.disabled).map(({ key, value }) => ({ key, value }));
}

/** Keeps raw, urlencoded and formdata bodies without their disabled fields; other modes (file, graphql) are dropped. */
function fromPostmanBody(body: PostmanBodyFull): PostmanBody | undefined {
  if (body.mode === 'raw' && body.raw) return { mode: 'raw', raw: body.raw };

  if (body.mode === 'urlencoded' && body.urlencoded)
    return { mode: 'urlencoded', urlencoded: body.urlencoded.filter((item) => !item.disabled) };

  if (body.mode === 'formdata' && body.formdata)
    return { mode: 'formdata', formdata: body.formdata.filter((item) => !item.disabled) };

  return undefined;
}

/** A folder has nested items and no request. */
function isPostmanFolder(item: PostmanItemFull | PostmanFolderFull): item is PostmanFolderFull {
  return 'item' in item && !('request' in item);
}

function isPostmanRequest(item: PostmanItemFull | PostmanFolderFull): item is PostmanItemFull {
  return 'request' in item;
}

// ---------- Validation ----------

/** Checks the minimum structure of a Postman collection: an info object with name and schema, and an item array. */
export function validatePostmanCollection(value: unknown): CollectionValidationResult {
  if (!isRecord(value)) return { valid: false, error: 'Invalid JSON object' };

  const { info, item } = value;

  if (!isRecord(info)) return { valid: false, error: 'Missing or invalid "info" field' };
  if (typeof info.name !== 'string') return { valid: false, error: 'Missing collection name in info' };
  if (typeof info.schema !== 'string' || !info.schema.includes('postman'))
    return { valid: false, error: 'Invalid or missing Postman schema URL' };
  if (!Array.isArray(item)) return { valid: false, error: 'Missing or invalid "item" array' };

  return { valid: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
