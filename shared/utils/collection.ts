import { PostmanCollection, PostmanFolder } from 'shared/types/postman';

export const COLLECTION_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
export const DEFAULT_FOLDER_ID = 'default';
export const DEFAULT_FOLDER_NAME = 'All Requests';

const DEFAULT_COLLECTION_NAME = 'Rentgen Collection';
const DEFAULT_COLLECTION_DESCRIPTION = 'Saved HTTP requests from Rentgen';

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
 * Builds a folder name that does not collide with existing folders by appending a counter.
 * `ignoreFolderId` excludes a folder from the check, e.g. the one being renamed.
 */
export function uniqueFolderName(folders: PostmanFolder[], name: string, ignoreFolderId?: string): string {
  const existingNames = new Set(folders.filter((folder) => folder.id !== ignoreFolderId).map((folder) => folder.name));
  if (!existingNames.has(name)) return name;

  let counter = 2;
  while (existingNames.has(`${name} (${counter})`)) counter++;

  return `${name} (${counter})`;
}
