import {
  PostmanBody,
  PostmanBodyMode,
  PostmanCollection,
  PostmanFolder,
  PostmanHeader,
  PostmanItem,
  PostmanNode,
  PostmanRequest,
} from 'shared/types/postman';
import { COLLECTION_SCHEMA, DEFAULT_COLLECTION_DESCRIPTION, isFolder, uniqueFolderName } from 'shared/utils/collection';
import { generateFolderId, generateRequestId } from 'shared/utils/id';
import { v4 as uuidv4 } from 'uuid';

export interface CollectionValidationResult {
  valid: boolean;
  error?: string;
}

// ---------- The Postman v2.1 file format (only read and written here) ----------

interface PostmanFileUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanFileQueryParam[];
  variable?: PostmanFileVariable[];
}

interface PostmanFileQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanFileVariable {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

/** Rentgen's header, plus what Postman adds to it. */
interface PostmanFileHeader extends PostmanHeader {
  type?: string; // Usually "text"
  disabled?: boolean;
  description?: string;
}

/** Rentgen's body, plus the modes Rentgen can't send (dropped on import) and the language of a raw body. */
interface PostmanFileBody extends Omit<PostmanBody, 'mode'> {
  mode?: PostmanBodyMode | 'file' | 'graphql';
  options?: {
    raw?: { language: string }; // "json", "xml", "text", etc.
  };
}

interface PostmanFileRequest {
  method: string;
  url: string | PostmanFileUrl;
  header?: PostmanFileHeader[];
  body?: PostmanFileBody;
}

// Postman item can be a request OR a folder (recursive)
interface PostmanFileItem {
  name: string;
  _postman_id?: string;
  request: PostmanFileRequest;
  response?: unknown[];
}

interface PostmanFileFolder {
  name: string;
  _postman_id?: string;
  item: (PostmanFileItem | PostmanFileFolder)[];
}

interface PostmanFileCollectionInfo {
  _postman_id?: string;
  /** Set on files exported by Rentgen: their top-level folders are Rentgen's top-level folders (see postmanToRentgen). */
  _rentgen_export?: boolean;
  name: string;
  description?: string;
  schema: string;
}

/** A collection as in a Postman v2.1 file. */
export interface PostmanFileCollection {
  info: PostmanFileCollectionInfo;
  item: (PostmanFileItem | PostmanFileFolder)[];
}

const DEFAULT_IMPORTED_COLLECTION_NAME = 'Imported Collection';

// ---------- Export: Rentgen -> Postman ----------

/** Converts a Rentgen collection to the full Postman v2.1 format. */
export function rentgenToPostman(collection: PostmanCollection): PostmanFileCollection {
  return {
    info: {
      _postman_id: uuidv4(),
      _rentgen_export: true,
      name: collection.info.name,
      description: collection.info.description || '',
      schema: COLLECTION_SCHEMA,
    },
    item: collection.item.map(toPostmanFolder),
  };
}

function toPostmanFolder(folder: PostmanFolder): PostmanFileFolder {
  return {
    name: folder.name,
    _postman_id: folder.id || uuidv4(),
    item: folder.item.map((node) => (isFolder(node) ? toPostmanFolder(node) : toPostmanItem(node))),
  };
}

function toPostmanItem(item: PostmanItem): PostmanFileItem {
  return {
    name: item.name,
    _postman_id: item.id || uuidv4(),
    request: toPostmanRequest(item.request),
    response: [],
  };
}

function toPostmanRequest(request: PostmanRequest): PostmanFileRequest {
  return {
    method: request.method,
    url: toPostmanUrl(request.url),
    header: request.header.map(({ key, value }) => ({ key, value, type: 'text', disabled: false })),
    body: request.body ? toPostmanBody(request.body) : undefined,
  };
}

/** Exports the content of the selected body mode; returns `undefined` if the mode has no content */
function toPostmanBody(body: PostmanBody): PostmanFileBody | undefined {
  if (body.mode === 'raw' && body.raw)
    return { mode: 'raw', raw: body.raw, options: { raw: { language: detectRawLanguage(body.raw) } } };
  if (body.mode === 'urlencoded' && body.urlencoded) return { mode: 'urlencoded', urlencoded: body.urlencoded };
  if (body.mode === 'formdata' && body.formdata) return { mode: 'formdata', formdata: body.formdata };

  return undefined;
}

/** Splits a URL into Postman's URL parts; a URL that can't be parsed (e.g. with `{{variables}}`) is kept raw. */
function toPostmanUrl(rawUrl: string): PostmanFileUrl {
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
 * Converts a Postman collection to the Rentgen format, keeping its folders and subfolders.
 *
 * A Postman collection becomes one top-level folder named after it, holding its folders and requests in their order:
 * a top-level folder in Rentgen is what a collection is in Postman. Files exported by Rentgen are not wrapped: their
 * top-level folders are restored as top-level folders (requests outside any folder, not written by Rentgen, then go to
 * a folder named after the collection, as the top level holds only folders).
 */
export function postmanToRentgen(postmanCollection: PostmanFileCollection): PostmanCollection {
  const collectionName = postmanCollection.info.name || DEFAULT_IMPORTED_COLLECTION_NAME;
  const info = {
    name: collectionName,
    description: postmanCollection.info.description || '',
    schema: COLLECTION_SCHEMA,
  };

  if (!isRentgenExport(postmanCollection))
    return {
      info,
      item: [
        {
          id: postmanCollection.info._postman_id || generateFolderId(),
          name: collectionName,
          item: fromPostmanItems(postmanCollection.item),
        },
      ],
    };

  const importedFolders: PostmanFolder[] = [];
  const rootRequests: PostmanItem[] = [];

  for (const item of postmanCollection.item) {
    if (isFolder(item)) importedFolders.push(fromPostmanFolder(item));
    else if (isRequest(item)) rootRequests.push(fromPostmanItem(item));
  }

  // The root folder comes first, and is kept even when empty if it is the only folder
  const folders: PostmanFolder[] =
    rootRequests.length > 0 || importedFolders.length === 0
      ? [{ id: generateFolderId(), name: collectionName, item: rootRequests }]
      : [];

  // On a name clash the folder gets a counter, e.g. "Users (2)"
  for (const folder of importedFolders) folders.push({ ...folder, name: uniqueFolderName(folders, folder.name) });

  return { info, item: folders };
}

/**
 * A file exported by Rentgen: marked as such, or (exported before the mark existed) with the description Rentgen gives
 * its collection.
 */
function isRentgenExport(postmanCollection: PostmanFileCollection): boolean {
  return (
    postmanCollection.info._rentgen_export === true ||
    postmanCollection.info.description === DEFAULT_COLLECTION_DESCRIPTION
  );
}

/** A folder with its requests and subfolders, in their order. Empty folders are kept, like in Postman. */
function fromPostmanFolder(folder: PostmanFileFolder): PostmanFolder {
  return { id: folder._postman_id || generateFolderId(), name: folder.name, item: fromPostmanItems(folder.item) };
}

/** Requests and folders in their order; a folder gets a counter in its name when a sibling folder already has it. */
function fromPostmanItems(items: (PostmanFileItem | PostmanFileFolder)[]): PostmanNode[] {
  const nodes: PostmanNode[] = [];

  for (const item of items) {
    if (isFolder(item)) {
      const folder = fromPostmanFolder(item);
      nodes.push({ ...folder, name: uniqueFolderName(nodes, folder.name) });
    } else if (isRequest(item)) nodes.push(fromPostmanItem(item));
  }

  return nodes;
}

function fromPostmanItem(item: PostmanFileItem): PostmanItem {
  return {
    id: item._postman_id || generateRequestId(),
    name: item.name,
    request: fromPostmanRequest(item.request),
  };
}

function fromPostmanRequest(request: PostmanFileRequest): PostmanRequest {
  return {
    method: request.method?.toUpperCase() || 'GET',
    url: fromPostmanUrl(request.url),
    header: fromPostmanHeaders(request.header ?? []),
    body: request.body ? fromPostmanBody(request.body) : undefined,
  };
}

/** Uses the raw URL when present, otherwise rebuilds it from its parts (disabled query parameters are skipped). */
function fromPostmanUrl(url: string | PostmanFileUrl | undefined): string {
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

function fromPostmanHeaders(headers: PostmanFileHeader[]): PostmanHeader[] {
  return headers.filter((header) => !header.disabled).map(({ key, value }) => ({ key, value }));
}

/** Keeps raw, urlencoded and formdata bodies without their disabled fields; other modes (file, graphql) are dropped. */
function fromPostmanBody(body: PostmanFileBody): PostmanBody | undefined {
  if (body.mode === 'raw' && body.raw) return { mode: 'raw', raw: body.raw };

  if (body.mode === 'urlencoded' && body.urlencoded)
    return { mode: 'urlencoded', urlencoded: body.urlencoded.filter((item) => !item.disabled) };

  if (body.mode === 'formdata' && body.formdata)
    return { mode: 'formdata', formdata: body.formdata.filter((item) => !item.disabled) };

  return undefined;
}

// Folders are recognized with isFolder (shared/utils/collection); anything else without a request is skipped
function isRequest(item: PostmanFileItem | PostmanFileFolder): item is PostmanFileItem {
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
