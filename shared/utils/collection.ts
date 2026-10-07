import { PostmanCollection } from '../types/postman';

export const DEFAULT_FOLDER_ID = 'default';
export const DEFAULT_FOLDER_NAME = 'All Requests';
export const COLLECTION_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

export function createEmptyCollection(): PostmanCollection {
  return {
    info: {
      name: 'Rentgen Collection',
      description: 'Saved HTTP requests from Rentgen',
      schema: COLLECTION_SCHEMA,
    },
    item: [
      {
        id: DEFAULT_FOLDER_ID,
        name: DEFAULT_FOLDER_NAME,
        item: [],
      },
    ],
  };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
