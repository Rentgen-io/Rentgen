import { PostmanCollection } from '../types/postman';

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
