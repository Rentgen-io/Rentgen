import { PostmanCollection, PostmanItem, PostmanNode } from 'shared/types/postman';

export const DEFAULT_COLLECTION_DESCRIPTION = 'Saved HTTP requests from Rentgen';
export const DEFAULT_FOLDER_ID = 'default';
export const DEFAULT_FOLDER_NAME = 'All Requests';
export const COLLECTION_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const DEFAULT_COLLECTION_NAME = 'Rentgen Collection';

/** A collection with only the default folder, which holds the requests saved without choosing a folder. */
export function createEmptyCollection(): PostmanCollection {
  return {
    info: {
      name: DEFAULT_COLLECTION_NAME,
      description: DEFAULT_COLLECTION_DESCRIPTION,
      schema: COLLECTION_SCHEMA,
    },
    item: [{ id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME, item: [] }],
  };
}

/**
 * A folder has nested items, a request doesn't. For Rentgen's collection and Postman files alike (they nest the same
 * way): narrows to the members of the union that have an `item` array. Safe on unvalidated data (e.g. an imported file).
 */
export function isFolder<N extends object>(node: N): node is Extract<N, { item: unknown[] }> {
  return Array.isArray((node as { item?: unknown }).item);
}

/** All requests of the folders, also those in subfolders, in the order they are listed (and run). */
export function collectRequests(nodes: PostmanNode[]): PostmanItem[] {
  return nodes.flatMap((node) => (isFolder(node) ? collectRequests(node.item) : [node]));
}

/** The number of folders and requests, also those in subfolders. Safe on unvalidated data. */
export function countNodes(nodes: PostmanNode[] | undefined): { folders: number; requests: number } {
  let folders = 0;
  let requests = 0;

  for (const node of nodes ?? []) {
    if (!isFolder(node)) {
      requests++;
      continue;
    }

    const nested = countNodes(node.item);
    folders += 1 + nested.folders;
    requests += nested.requests;
  }

  return { folders, requests };
}

/**
 * Builds a folder name that does not collide with its sibling folders by appending a counter.
 * `ignoreFolderId` excludes a folder from the check, e.g. the one being renamed.
 */
export function uniqueFolderName(siblings: PostmanNode[], name: string, ignoreFolderId?: string): string {
  const existingNames = new Set(
    siblings.filter((node) => isFolder(node) && node.id !== ignoreFolderId).map((folder) => folder.name),
  );
  if (!existingNames.has(name)) return name;

  let counter = 2;
  while (existingNames.has(`${name} (${counter})`)) counter++;

  return `${name} (${counter})`;
}
