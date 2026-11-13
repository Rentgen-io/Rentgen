import { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME } from 'shared/utils/collection';
import { generateFolderId, generateRequestId } from 'shared/utils/id';
import {
  ImportConflict,
  ImportConflictSummary,
  PostmanBody,
  PostmanCollection,
  PostmanFolder,
  PostmanHeader,
  PostmanItem,
  PostmanRequest,
  PreEvaluation,
} from 'src/types';

export { createEmptyCollection } from 'shared/utils/collection';

/** A request as listed in the sidebar. */
export interface CollectionItemData {
  id: string;
  method: string;
  url: string;
  name: string;
  folderId: string;
}

/** A folder as listed in the sidebar. */
export interface CollectionFolderData {
  id: string;
  name: string;
  items: CollectionItemData[];
}

export interface RequestWithFolder {
  folder: PostmanFolder;
  request: PostmanItem;
}

/** Position of a request inside a collection. */
interface RequestLocation {
  folderIndex: number;
  itemIndex: number;
}

// ---------- Headers ----------

export function headersToPostmanFormat(headers: Record<string, string>): PostmanHeader[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

/** When a header repeats, the last value wins. */
export function postmanHeadersToRecord(headers: PostmanHeader[]): Record<string, string> {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

/** Formats headers as the header editor's text: one `Name: value` per line. */
export function headersRecordToString(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

// ---------- Requests ----------

/** Adds a request at the top of the folder, creating the folder at the end of the collection if it doesn't exist. */
export function addRequestToCollection(
  collection: PostmanCollection,
  method: string,
  url: string,
  headers: Record<string, string>,
  body: PostmanBody,
  preEvaluation: PreEvaluation | null,
  folderId: string = DEFAULT_FOLDER_ID,
): PostmanCollection {
  const item: PostmanItem = {
    id: generateRequestId(),
    name: url,
    request: buildPostmanRequest(method, url, headers, body),
    ...(preEvaluation !== null && { preEvaluation }),
  };
  const folders = collection.item.some((folder) => folder.id === folderId)
    ? collection.item
    : [...collection.item, createFolder(folderId)];
  const folderIndex = folders.findIndex((folder) => folder.id === folderId);

  return {
    ...collection,
    item: folders.map((folder, index) =>
      index === folderIndex ? { ...folder, item: [item, ...folder.item] } : folder,
    ),
  };
}

/**
 * Replaces the request's method, URL, headers and body.
 * A `null` preEvaluation keeps the saved one. Returns the same collection when the request isn't found.
 */
export function updateRequestInCollection(
  collection: PostmanCollection,
  requestId: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  body: PostmanBody,
  preEvaluation: PreEvaluation | null,
): PostmanCollection {
  return updateRequestItem(collection, requestId, (item) => ({
    ...item,
    request: buildPostmanRequest(method, url, headers, body),
    ...(preEvaluation !== null && { preEvaluation }),
  }));
}

export function renameRequestInCollection(
  collection: PostmanCollection,
  requestId: string,
  newName: string,
): PostmanCollection {
  return updateRequestItem(collection, requestId, (item) => ({ ...item, name: newName }));
}

/** Moves a request to the position of another request in the same folder. */
export function reorderRequestInCollection(
  collection: PostmanCollection,
  activeId: string,
  overId: string,
): PostmanCollection {
  const folderIndex = collection.item.findIndex(
    (folder) => folder.item.some((item) => item.id === activeId) && folder.item.some((item) => item.id === overId),
  );

  return {
    ...collection,
    item: collection.item.map((folder, index) => {
      if (index !== folderIndex) return { ...folder, item: [...folder.item] };

      const activeIndex = folder.item.findIndex((item) => item.id === activeId);
      const overIndex = folder.item.findIndex((item) => item.id === overId);

      return { ...folder, item: moveArrayItem(folder.item, activeIndex, overIndex) };
    }),
  };
}

/** Moves a request to another folder, at `targetIndex` or at the end. */
export function moveRequestToFolder(
  collection: PostmanCollection,
  requestId: string,
  targetFolderId: string,
  targetIndex?: number,
): PostmanCollection {
  const source = findRequestWithFolder(collection, requestId);

  // Without an existing target folder the request would be removed and never re-inserted
  if (!source || source.folder.id === targetFolderId || !collection.item.some((folder) => folder.id === targetFolderId))
    return collection;

  return {
    ...collection,
    item: collection.item.map((folder) => {
      if (folder.id === source.folder.id)
        return { ...folder, item: folder.item.filter((item) => item.id !== requestId) };

      if (folder.id === targetFolderId) {
        const items = [...folder.item];
        items.splice(targetIndex ?? items.length, 0, source.request);

        return { ...folder, item: items };
      }

      return folder;
    }),
  };
}

export function removeRequestFromCollection(collection: PostmanCollection, requestId: string): PostmanCollection {
  const location = findRequestLocation(collection, requestId);
  if (!location) return { ...collection };

  return {
    ...collection,
    item: collection.item.map((folder, index) =>
      index === location.folderIndex
        ? { ...folder, item: folder.item.filter((_, itemIndex) => itemIndex !== location.itemIndex) }
        : folder,
    ),
  };
}

export function findRequestById(collection: PostmanCollection, requestId: string): PostmanItem | null {
  return findRequestWithFolder(collection, requestId)?.request ?? null;
}

export function findFolderIdByRequestId(collection: PostmanCollection, requestId: string): string | null {
  return findRequestWithFolder(collection, requestId)?.folder.id ?? null;
}

/** Finds a request together with its folder, e.g. when the folder's dynamic variables are needed too. */
export function findRequestWithFolder(collection: PostmanCollection, requestId: string): RequestWithFolder | null {
  const location = findRequestLocation(collection, requestId);
  if (!location) return null;

  const folder = collection.item[location.folderIndex];

  return { folder, request: folder.item[location.itemIndex] };
}

// ---------- Folders ----------

/** Adds an empty folder at the top of the collection. */
export function addFolderToCollection(collection: PostmanCollection, name: string): PostmanCollection {
  const folder: PostmanFolder = { id: generateFolderId(), name, item: [] };

  return { ...collection, item: [folder, ...collection.item] };
}

export function renameFolderInCollection(
  collection: PostmanCollection,
  folderId: string,
  newName: string,
): PostmanCollection {
  return {
    ...collection,
    item: collection.item.map((folder) => (folder.id === folderId ? { ...folder, name: newName } : folder)),
  };
}

/** Moves a folder to the position of another folder. */
export function reorderFolderInCollection(
  collection: PostmanCollection,
  activeId: string,
  overId: string,
): PostmanCollection {
  const activeIndex = collection.item.findIndex((folder) => folder.id === activeId);
  const overIndex = collection.item.findIndex((folder) => folder.id === overId);

  return { ...collection, item: moveArrayItem(collection.item, activeIndex, overIndex) };
}

export function removeFolderFromCollection(collection: PostmanCollection, folderId: string): PostmanCollection {
  return { ...collection, item: collection.item.filter((folder) => folder.id !== folderId) };
}

/**
 * Builds a folder name that does not collide with existing folders by appending a counter.
 * `ignoreFolderId` excludes a folder from the check, e.g. the one being renamed.
 */
export function uniqueFolderName(collection: PostmanCollection, name: string, ignoreFolderId?: string): string {
  const existingNames = new Set(
    collection.item.filter((folder) => folder.id !== ignoreFolderId).map((folder) => folder.name),
  );
  if (!existingNames.has(name)) return name;

  let counter = 2;
  while (existingNames.has(`${name} (${counter})`)) counter++;

  return `${name} (${counter})`;
}

// ---------- Sidebar ----------

export function collectionToGroupedSidebarData(collection: PostmanCollection): CollectionFolderData[] {
  return collection.item.map((folder) => ({
    id: folder.id,
    name: folder.id === DEFAULT_FOLDER_ID ? (folder.name ?? DEFAULT_FOLDER_NAME) : folder.name,
    items: folder.item.map((item) => ({
      id: item.id,
      method: item.request.method,
      url: item.request.url,
      name: item.name,
      folderId: folder.id,
    })),
  }));
}

/**
 * Keeps whole folders whose name matches, and otherwise only the requests whose name, URL, method,
 * header or raw body matches (case-insensitive). Folders left without requests are dropped.
 */
export function filterCollectionsBySearch(
  folders: CollectionFolderData[],
  collection: PostmanCollection,
  searchTerm: string,
): CollectionFolderData[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return folders;

  const matches = (text: string | undefined): boolean => !!text?.toLowerCase().includes(term);
  const isMatchingItem = (item: CollectionItemData): boolean => {
    if (matches(item.name) || matches(item.url) || matches(item.method)) return true;

    // Headers and body are only in the full collection data
    const request = findRequestById(collection, item.id)?.request;
    if (!request) return false;

    return request.header.some((header) => matches(header.key) || matches(header.value)) || matches(request.body?.raw);
  };

  return folders.flatMap((folder) => {
    if (matches(folder.name)) return [folder];

    const items = folder.items.filter(isMatchingItem);

    return items.length > 0 ? [{ ...folder, items }] : [];
  });
}

// ---------- Import ----------

/**
 * Finds the imported requests that clash with existing ones in a folder of the same name:
 * the same method and URL, or else the same name. Empty folders never conflict.
 */
export function detectImportConflicts(existing: PostmanCollection, imported: PostmanCollection): ImportConflictSummary {
  const folderConflicts: ImportConflict[] = [];
  const requestConflicts: ImportConflict[] = [];

  for (const importedFolder of imported.item) {
    if (importedFolder.item.length === 0) continue;

    const existingFolder = existing.item.find((folder) => folder.name === importedFolder.name);
    if (!existingFolder || existingFolder.item.length === 0) continue;

    let hasRequestConflicts = false;

    for (const importedItem of importedFolder.item) {
      const sameEndpointItem = existingFolder.item.find((existingItem) => isSameEndpoint(existingItem, importedItem));
      const sameNameItem = existingFolder.item.find((existingItem) => existingItem.name === importedItem.name);
      const conflictingItem = sameEndpointItem ?? sameNameItem;
      if (!conflictingItem) continue;

      hasRequestConflicts = true;
      requestConflicts.push({
        type: 'request',
        existingName: conflictingItem.name,
        importedName: importedItem.name,
        folderId: existingFolder.id,
        folderName: existingFolder.name,
        // Only an endpoint match identifies the request by method and URL
        ...(sameEndpointItem && {
          requestMethod: importedItem.request.method,
          requestUrl: importedItem.request.url,
        }),
      });
    }

    if (hasRequestConflicts)
      folderConflicts.push({
        type: 'folder',
        existingName: existingFolder.name,
        importedName: importedFolder.name,
        folderId: existingFolder.id,
      });
  }

  return {
    hasConflicts: folderConflicts.length > 0 || requestConflicts.length > 0,
    collectionNameMatch: existing.info.name === imported.info.name,
    folderConflicts,
    requestConflicts,
  };
}

/**
 * Counts the folders and requests a merge would add: folders whose name is new, and requests that don't
 * match an existing one in the same folder by method and URL or by name.
 */
export function countMergeAdditions(
  existing: PostmanCollection,
  imported: PostmanCollection,
): { folders: number; requests: number } {
  let folders = 0;
  let requests = 0;

  for (const importedFolder of imported.item) {
    const existingFolder = existing.item.find((folder) => folder.name === importedFolder.name);

    if (!existingFolder) {
      folders++;
      requests += importedFolder.item.length;
      continue;
    }

    requests += importedFolder.item.filter(
      (importedItem) =>
        !existingFolder.item.some(
          (existingItem) => isSameEndpoint(existingItem, importedItem) || existingItem.name === importedItem.name,
        ),
    ).length;
  }

  return { folders, requests };
}

// ---------- Helpers ----------

function buildPostmanRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: PostmanBody,
): PostmanRequest {
  const postmanBody = toPostmanBody(body);

  return {
    method: method.toUpperCase(),
    header: headersToPostmanFormat(headers),
    url,
    ...(postmanBody && { body: postmanBody }),
  };
}

/** Keeps only the field of the selected body mode; a body without a mode is not saved. */
function toPostmanBody(body: PostmanBody): PostmanBody | undefined {
  switch (body.mode) {
    case 'formdata':
      return { mode: 'formdata', formdata: body.formdata };
    case 'raw':
      return { mode: 'raw', raw: body.raw };
    case 'urlencoded':
      return { mode: 'urlencoded', urlencoded: body.urlencoded };
    default:
      return undefined;
  }
}

function createFolder(folderId: string): PostmanFolder {
  return { id: folderId, name: folderId === DEFAULT_FOLDER_ID ? DEFAULT_FOLDER_NAME : folderId, item: [] };
}

function findRequestLocation(collection: PostmanCollection, requestId: string): RequestLocation | null {
  for (const [folderIndex, folder] of collection.item.entries()) {
    const itemIndex = folder.item.findIndex((item) => item.id === requestId);
    if (itemIndex !== -1) return { folderIndex, itemIndex };
  }

  return null;
}

/** Replaces a request with `update(request)`; returns the same collection when the request isn't found. */
function updateRequestItem(
  collection: PostmanCollection,
  requestId: string,
  update: (item: PostmanItem) => PostmanItem,
): PostmanCollection {
  const location = findRequestLocation(collection, requestId);
  if (!location) return collection;

  return {
    ...collection,
    item: collection.item.map((folder, folderIndex) =>
      folderIndex === location.folderIndex
        ? {
            ...folder,
            item: folder.item.map((item, itemIndex) => (itemIndex === location.itemIndex ? update(item) : item)),
          }
        : folder,
    ),
  };
}

function isSameEndpoint(first: PostmanItem, second: PostmanItem): boolean {
  return first.request.url === second.request.url && first.request.method === second.request.method;
}

/** Returns a copy with the item at `fromIndex` moved to `toIndex`; unchanged copy when either index is -1. */
function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...items];
  if (fromIndex === -1 || toIndex === -1) return result;

  const [movedItem] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, movedItem);

  return result;
}
