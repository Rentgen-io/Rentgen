import {
  PostmanBody,
  PostmanCollection,
  PostmanFolder,
  PostmanHeader,
  PostmanItem,
  PostmanNode,
  PostmanRequest,
} from 'shared/types/postman';
import { PreEvaluation } from 'shared/types/pre-evaluation';
import {
  countNodes,
  DEFAULT_FOLDER_ID,
  DEFAULT_FOLDER_NAME,
  isFolder,
  uniqueFolderName,
} from 'shared/utils/collection';
import { generateFolderId, generateRequestId } from 'shared/utils/id';

// Joins the names of nested folders when they are shown as one text, e.g. "Users / Admin"
export const FOLDER_PATH_SEPARATOR = ' / ';

export interface ImportConflict {
  type: 'collection' | 'folder' | 'request';
  existingName: string;
  importedName: string;
  folderId?: string;
  folderName?: string;
  requestMethod?: string;
  requestUrl?: string;
}

export interface ImportConflictSummary {
  hasConflicts: boolean;
  collectionNameMatch: boolean;
  folderConflicts: ImportConflict[];
  requestConflicts: ImportConflict[];
}

/**
 * Where a dragged row is dropped, relative to the row it is dropped on: before or after it, inside it (a folder: as its
 * last entry), or first inside it (an expanded folder: above its first entry).
 */
export type DropPosition = 'before' | 'after' | 'inside' | 'first';

/** A request as listed in the sidebar. */
export interface CollectionItemData {
  type: 'request';
  id: string;
  method: string;
  url: string;
  name: string;
  folderId: string;
}

/** A folder as listed in the sidebar. */
export interface CollectionFolderData {
  type: 'folder';
  id: string;
  name: string;
  children: CollectionNodeData[];
  isTopLevel: boolean;
  /** Its requests, also those in subfolders: for its request count, status color and run. */
  requestIds: string[];
}

export type CollectionNodeData = CollectionFolderData | CollectionItemData;

export interface RequestWithFolder {
  /** The folder the request is directly in. */
  folder: PostmanFolder;
  /** The folders from the top level down to `folder`, included. */
  path: PostmanFolder[];
  request: PostmanItem;
}

/** Where a request or folder is in the collection. */
interface NodeLocation {
  node: PostmanNode;
  /** The folder it is directly in; null at the top level. */
  parent: PostmanFolder | null;
  /** The folders from the top level down to `parent`, included. */
  path: PostmanFolder[];
}

// ---------- Requests ----------

/** Adds a request at the top of the folder, creating the folder at the end of the collection if it doesn't exist. */
export function addRequestToCollection(
  collection: PostmanCollection,
  method: string,
  url: string,
  headers: PostmanHeader[],
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
  const folders = findFolderById(collection, folderId) ? collection.item : [...collection.item, createFolder(folderId)];

  return {
    ...collection,
    item: updateFolder(folders, folderId, (folder) => ({ ...folder, item: [item, ...folder.item] })),
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
  headers: PostmanHeader[],
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

export function removeRequestFromCollection(collection: PostmanCollection, requestId: string): PostmanCollection {
  return { ...collection, item: removeNode(collection.item, isRequestWithId(requestId)) };
}

export function findRequestById(collection: PostmanCollection, requestId: string): PostmanItem | null {
  return findRequestWithFolder(collection, requestId)?.request ?? null;
}

export function findFolderIdByRequestId(collection: PostmanCollection, requestId: string): string | null {
  return findRequestWithFolder(collection, requestId)?.folder.id ?? null;
}

/** Finds a request together with its folder, e.g. when the folder's dynamic variables are needed too. */
export function findRequestWithFolder(collection: PostmanCollection, requestId: string): RequestWithFolder | null {
  const location = locateNode(collection.item, isRequestWithId(requestId));
  if (!location?.parent) return null;

  return { folder: location.parent, path: location.path, request: location.node as PostmanItem };
}

// ---------- Folders ----------

/** Finds a folder at any depth. */
export function findFolderById(collection: PostmanCollection, folderId: string): PostmanFolder | null {
  return (locateNode(collection.item, isFolderWithId(folderId))?.node as PostmanFolder | undefined) ?? null;
}

/**
 * Adds an empty folder: at the top of the collection, or as the last entry of the parent folder (like Postman). Its
 * name gets a counter when a sibling folder already has it.
 */
export function addFolderToCollection(
  collection: PostmanCollection,
  name: string,
  parentId: string | null = null,
  id: string = generateFolderId(),
): PostmanCollection {
  if (!parentId) {
    const folder: PostmanFolder = { id, name: uniqueFolderName(collection.item, name), item: [] };
    return { ...collection, item: [folder, ...collection.item] };
  }

  return {
    ...collection,
    item: updateFolder(collection.item, parentId, (parent) => ({
      ...parent,
      item: [...parent.item, { id, name: uniqueFolderName(parent.item, name), item: [] }],
    })),
  };
}

/** Renames a folder; the name gets a counter when a sibling folder already has it. */
export function renameFolderInCollection(
  collection: PostmanCollection,
  folderId: string,
  newName: string,
): PostmanCollection {
  const location = locateNode(collection.item, isFolderWithId(folderId));
  if (!location) return collection;

  const name = uniqueFolderName(location.parent?.item ?? collection.item, newName, folderId);

  return { ...collection, item: updateFolder(collection.item, folderId, (folder) => ({ ...folder, name })) };
}

/** Removes a folder with everything in it. */
export function removeFolderFromCollection(collection: PostmanCollection, folderId: string): PostmanCollection {
  return { ...collection, item: removeNode(collection.item, isFolderWithId(folderId)) };
}

// ---------- Moving (drag and drop) ----------

/**
 * Whether a request / folder can be dropped at `position` of another one: not on itself, a folder not into itself or
 * its own subfolders, only into folders, and not as a request at the top level (it holds only folders).
 */
export function canMoveNode(
  collection: PostmanCollection,
  nodeId: string,
  targetId: string,
  position: DropPosition,
): boolean {
  if (nodeId === targetId) return false;

  const source = locateNode(collection.item, (node) => node.id === nodeId);
  const target = locateNode(collection.item, (node) => node.id === targetId);
  if (!source || !target) return false;

  if (isFolder(source.node) && target.path.some((folder) => folder.id === nodeId)) return false;
  if (position === 'inside' || position === 'first') return isFolder(target.node);

  return target.parent !== null || isFolder(source.node);
}

/**
 * Moves a request / folder (with everything in it) to `position` of another one. A folder moved to another parent gets
 * a counter in its name when a new sibling folder already has it. Returns the same collection when the move isn't
 * possible (see canMoveNode).
 */
export function moveNodeInCollection(
  collection: PostmanCollection,
  nodeId: string,
  targetId: string,
  position: DropPosition,
): PostmanCollection {
  if (!canMoveNode(collection, nodeId, targetId, position)) return collection;

  const source = locateNode(collection.item, (node) => node.id === nodeId) as NodeLocation;
  const { node } = source;
  const tree = removeNode(collection.item, (candidate) => candidate === node);

  let parentId: string | null;
  let index: number;

  if (position === 'inside' || position === 'first') {
    parentId = targetId;
    index = position === 'first' ? 0 : (locateNode(tree, isFolderWithId(targetId))?.node as PostmanFolder).item.length;
  } else {
    const target = locateNode(tree, (candidate) => candidate.id === targetId) as NodeLocation;
    const siblings: PostmanNode[] = target.parent?.item ?? tree;

    parentId = target.parent?.id ?? null;
    index = siblings.indexOf(target.node) + (position === 'after' ? 1 : 0);
  }

  const isNewParent = parentId !== (source.parent?.id ?? null);
  const insertInto = <T extends PostmanNode>(siblings: T[]): T[] => {
    const moved = isFolder(node) && isNewParent ? { ...node, name: uniqueFolderName(siblings, node.name) } : node;
    return [...siblings.slice(0, index), moved as T, ...siblings.slice(index)];
  };

  return {
    ...collection,
    item:
      parentId === null
        ? insertInto(tree)
        : updateFolder(tree, parentId, (folder) => ({ ...folder, item: insertInto(folder.item) })),
  };
}

// ---------- Sidebar ----------

// The last built sidebar objects by id, to hand out the same objects while what they show is unchanged
let previousFolders = new Map<string, CollectionFolderData>();
let previousItems = new Map<string, CollectionItemData>();

/**
 * The collection as listed in the sidebar. Folders and requests whose shown values are unchanged keep their previous
 * object (e.g. after saving a request's body or a run result), so their memoized sidebar rows don't re-render.
 */
export function collectionToGroupedSidebarData(collection: PostmanCollection): CollectionFolderData[] {
  const folders = new Map<string, CollectionFolderData>();
  const items = new Map<string, CollectionItemData>();

  const toItemData = (item: PostmanItem, folderId: string): CollectionItemData => {
    const previous = previousItems.get(item.id);
    const view: CollectionItemData =
      previous &&
      previous.name === item.name &&
      previous.method === item.request.method &&
      previous.url === item.request.url &&
      previous.folderId === folderId
        ? previous
        : {
            type: 'request',
            id: item.id,
            method: item.request.method,
            url: item.request.url,
            name: item.name,
            folderId,
          };

    items.set(item.id, view);
    return view;
  };

  const toFolderData = (folder: PostmanFolder, isTopLevel: boolean): CollectionFolderData => {
    const children = folder.item.map((node) =>
      isFolder(node) ? toFolderData(node, false) : toItemData(node, folder.id),
    );
    const name = folder.id === DEFAULT_FOLDER_ID ? (folder.name ?? DEFAULT_FOLDER_NAME) : folder.name;
    const previous = previousFolders.get(folder.id);
    const view: CollectionFolderData =
      previous &&
      previous.name === name &&
      previous.isTopLevel === isTopLevel &&
      previous.children.length === children.length &&
      previous.children.every((child, index) => child === children[index])
        ? previous
        : { type: 'folder', id: folder.id, name, children, isTopLevel, requestIds: getRequestIds(children) };

    folders.set(folder.id, view);
    return view;
  };

  const result = collection.item.map((folder) => toFolderData(folder, true));

  // Only the current ones are kept: removed folders / requests don't stay in memory
  previousFolders = folders;
  previousItems = items;

  return result;
}

/**
 * Keeps whole folders whose name matches, and otherwise only the requests whose name, URL, method, header or raw body
 * matches (case-insensitive), with the folders leading to them. Folders left without matches are dropped.
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

  const filterFolder = (folder: CollectionFolderData): CollectionFolderData[] => {
    if (matches(folder.name)) return [folder];

    const children = folder.children.flatMap((child): CollectionNodeData[] =>
      child.type === 'folder' ? filterFolder(child) : isMatchingItem(child) ? [child] : [],
    );

    return children.length > 0 ? [{ ...folder, children, requestIds: getRequestIds(children) }] : [];
  };

  return folders.flatMap(filterFolder);
}

// ---------- Import ----------

/**
 * Finds the imported requests that clash with existing ones in a folder at the same path (folders matched by name):
 * the same method and URL, or else the same name. Empty folders never conflict.
 */
export function detectImportConflicts(existing: PostmanCollection, imported: PostmanCollection): ImportConflictSummary {
  const folderConflicts: ImportConflict[] = [];
  const requestConflicts: ImportConflict[] = [];

  const compareFolders = (existingFolder: PostmanFolder, importedFolder: PostmanFolder, path: string) => {
    const existingRequests = existingFolder.item.filter(isRequest);
    let hasRequestConflicts = false;

    for (const importedNode of importedFolder.item) {
      if (isFolder(importedNode)) {
        const existingSubfolder = findFolderByName(existingFolder.item, importedNode.name);
        if (existingSubfolder)
          compareFolders(existingSubfolder, importedNode, `${path}${FOLDER_PATH_SEPARATOR}${importedNode.name}`);

        continue;
      }

      const sameEndpointItem = existingRequests.find((existingItem) => isSameEndpoint(existingItem, importedNode));
      const sameNameItem = existingRequests.find((existingItem) => existingItem.name === importedNode.name);
      const conflictingItem = sameEndpointItem ?? sameNameItem;
      if (!conflictingItem) continue;

      hasRequestConflicts = true;
      requestConflicts.push({
        type: 'request',
        existingName: conflictingItem.name,
        importedName: importedNode.name,
        folderId: existingFolder.id,
        folderName: path,
        // Only an endpoint match identifies the request by method and URL
        ...(sameEndpointItem && {
          requestMethod: importedNode.request.method,
          requestUrl: importedNode.request.url,
        }),
      });
    }

    if (hasRequestConflicts)
      folderConflicts.push({ type: 'folder', existingName: path, importedName: path, folderId: existingFolder.id });
  };

  for (const importedFolder of imported.item) {
    const existingFolder = findFolderByName(existing.item, importedFolder.name);
    if (existingFolder) compareFolders(existingFolder, importedFolder, importedFolder.name);
  }

  return {
    hasConflicts: folderConflicts.length > 0 || requestConflicts.length > 0,
    collectionNameMatch: existing.info.name === imported.info.name,
    folderConflicts,
    requestConflicts,
  };
}

/**
 * Counts the folders and requests a merge would add (see mergeCollections): folders whose name is new at their level,
 * with everything in them, and requests that don't match an existing one in the same folder by method and URL or name.
 */
export function countMergeAdditions(
  existing: PostmanCollection,
  imported: PostmanCollection,
): { folders: number; requests: number } {
  let folders = 0;
  let requests = 0;

  const countAdditions = (existingNodes: PostmanNode[], importedNodes: PostmanNode[]) => {
    const existingRequests = existingNodes.filter(isRequest);

    for (const importedNode of importedNodes) {
      if (!isFolder(importedNode)) {
        if (!existingRequests.some((existingItem) => isDuplicateRequest(existingItem, importedNode))) requests++;
        continue;
      }

      const existingFolder = findFolderByName(existingNodes, importedNode.name);
      if (existingFolder) {
        countAdditions(existingFolder.item, importedNode.item);
        continue;
      }

      const nested = countNodes(importedNode.item);
      folders += 1 + nested.folders;
      requests += nested.requests;
    }
  };

  countAdditions(existing.item, imported.item);

  return { folders, requests };
}

/**
 * Merges level by level: folders with the same name are merged, new ones are added with everything in them, and only
 * requests not matching an existing one of the folder (same method and URL, or same name) are added. New IDs are
 * generated for everything added, to avoid collisions.
 */
export function mergeCollections(existing: PostmanCollection, imported: PostmanCollection): PostmanCollection {
  const mergeNodes = <T extends PostmanNode>(existingNodes: T[], importedNodes: PostmanNode[]): T[] => {
    const existingRequests = (existingNodes as PostmanNode[]).filter(isRequest);
    const result = [...existingNodes];

    for (const importedNode of importedNodes) {
      if (!isFolder(importedNode)) {
        if (!existingRequests.some((existingItem) => isDuplicateRequest(existingItem, importedNode)))
          result.push({ ...importedNode, id: generateRequestId() } as T);

        continue;
      }

      const index = result.findIndex((node) => isFolder(node) && node.name === importedNode.name);
      if (index === -1) {
        result.push(withNewIds(importedNode) as T);
        continue;
      }

      const existingFolder = result[index] as PostmanFolder;
      result[index] = { ...existingFolder, item: mergeNodes(existingFolder.item, importedNode.item) } as T;
    }

    return result;
  };

  return { ...existing, item: mergeNodes(existing.item, imported.item) };
}

/**
 * Replaces the top-level folders matching an imported one by name, and adds the others. A replaced folder keeps its
 * ID, and so do its requests still in it (matched by ID, keeping their pre-evaluation) and subfolders still in it
 * (matched by name), so selection, mappings and dynamic variables stay linked to them.
 */
export function replaceFolders(existing: PostmanCollection, imported: PostmanCollection): PostmanCollection {
  const item = [...existing.item];
  // Folders already replaced by this import, so duplicate names inside the imported file don't overwrite each other
  const replacedFolderIds = new Set<string>();

  for (const importedFolder of imported.item) {
    const index = item.findIndex((folder) => folder.name === importedFolder.name && !replacedFolderIds.has(folder.id));

    if (index === -1) {
      item.push(withNewIds(importedFolder));
      continue;
    }

    item[index] = replaceFolder(item[index], importedFolder);
    replacedFolderIds.add(item[index].id);
  }

  return { ...existing, item };
}

/** Adds every imported folder as a copy: new IDs, and "(copy)" appended to the top-level folder names. */
export function copyFolders(existing: PostmanCollection, imported: PostmanCollection): PostmanCollection {
  const item = [...existing.item];

  for (const folder of imported.item)
    item.push({ ...withNewIds(folder), name: uniqueFolderName(item, `${folder.name} (copy)`) });

  return { ...existing, item };
}

/** A copy of the folder with new IDs for it and everything in it. */
export function withNewIds(folder: PostmanFolder): PostmanFolder {
  return {
    ...folder,
    id: generateFolderId(),
    item: folder.item.map((node) => (isFolder(node) ? withNewIds(node) : { ...node, id: generateRequestId() })),
  };
}

// ---------- Helpers ----------

function buildPostmanRequest(method: string, url: string, headers: PostmanHeader[], body: PostmanBody): PostmanRequest {
  const postmanBody = toPostmanBody(body);

  return {
    method: method.toUpperCase(),
    header: headers,
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

function replaceFolder(existingFolder: PostmanFolder, importedFolder: PostmanFolder): PostmanFolder {
  const replacedSubfolderIds = new Set<string>();

  return {
    ...importedFolder,
    id: existingFolder.id,
    item: importedFolder.item.map((importedNode) => {
      if (isFolder(importedNode)) {
        const existingSubfolder = existingFolder.item.find(
          (node): node is PostmanFolder =>
            isFolder(node) && node.name === importedNode.name && !replacedSubfolderIds.has(node.id),
        );
        if (!existingSubfolder) return withNewIds(importedNode);

        replacedSubfolderIds.add(existingSubfolder.id);
        return replaceFolder(existingSubfolder, importedNode);
      }

      const existingRequest = existingFolder.item.find(
        (node): node is PostmanItem => isRequest(node) && node.id === importedNode.id,
      );

      return existingRequest
        ? { ...importedNode, id: existingRequest.id, preEvaluation: existingRequest.preEvaluation }
        : { ...importedNode, id: generateRequestId() };
    }),
  };
}

/** Finds a request / folder at any depth, with the folders leading to it. */
function locateNode(
  nodes: PostmanNode[],
  match: (node: PostmanNode) => boolean,
  parent: PostmanFolder | null = null,
  path: PostmanFolder[] = [],
): NodeLocation | null {
  for (const node of nodes) {
    if (match(node)) return { node, parent, path };

    if (isFolder(node)) {
      const location = locateNode(node.item, match, node, [...path, node]);
      if (location) return location;
    }
  }

  return null;
}

/**
 * Replaces the folder (at any depth) with `update(folder)`. Only the folders leading to it are copied, the others keep
 * their object; returns the same array when the folder isn't found.
 */
function updateFolder<T extends PostmanNode>(
  nodes: T[],
  folderId: string,
  update: (folder: PostmanFolder) => PostmanFolder,
): T[] {
  let isChanged = false;

  const result = nodes.map((node) => {
    if (!isFolder(node)) return node;

    if (node.id === folderId) {
      isChanged = true;
      return update(node) as T;
    }

    const item = updateFolder(node.item, folderId, update);
    if (item === node.item) return node;

    isChanged = true;
    return { ...node, item } as T;
  });

  return isChanged ? result : nodes;
}

/** Removes the matching requests / folders at any depth; returns the same array when none matches. */
function removeNode<T extends PostmanNode>(nodes: T[], match: (node: PostmanNode) => boolean): T[] {
  let isChanged = false;
  const result: T[] = [];

  for (const node of nodes) {
    if (match(node)) {
      isChanged = true;
      continue;
    }

    if (isFolder(node)) {
      const item = removeNode(node.item, match);

      if (item !== node.item) {
        isChanged = true;
        result.push({ ...node, item } as T);
        continue;
      }
    }

    result.push(node);
  }

  return isChanged ? result : nodes;
}

/** Replaces a request with `update(request)`; returns the same collection when the request isn't found. */
function updateRequestItem(
  collection: PostmanCollection,
  requestId: string,
  update: (item: PostmanItem) => PostmanItem,
): PostmanCollection {
  const location = locateNode(collection.item, isRequestWithId(requestId));
  if (!location?.parent) return collection;

  return {
    ...collection,
    item: updateFolder(collection.item, location.parent.id, (folder) => ({
      ...folder,
      item: folder.item.map((node) => (node === location.node ? update(node as PostmanItem) : node)),
    })),
  };
}

function getRequestIds(children: CollectionNodeData[]): string[] {
  return children.flatMap((child) => (child.type === 'folder' ? child.requestIds : [child.id]));
}

function findFolderByName(nodes: PostmanNode[], name: string): PostmanFolder | undefined {
  return nodes.find((node): node is PostmanFolder => isFolder(node) && node.name === name);
}

function isRequest(node: PostmanNode): node is PostmanItem {
  return !isFolder(node);
}

function isFolderWithId(folderId: string) {
  return (node: PostmanNode) => isFolder(node) && node.id === folderId;
}

function isRequestWithId(requestId: string) {
  return (node: PostmanNode) => !isFolder(node) && node.id === requestId;
}

function isSameEndpoint(first: PostmanItem, second: PostmanItem): boolean {
  return first.request.url === second.request.url && first.request.method === second.request.method;
}

/** How imports recognize a request already in the folder: the same method and URL, or the same name. */
function isDuplicateRequest(existingItem: PostmanItem, importedItem: PostmanItem): boolean {
  return isSameEndpoint(existingItem, importedItem) || existingItem.name === importedItem.name;
}
