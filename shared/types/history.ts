import { PostmanBodyMode, PostmanFormDataItem } from './postman';

export interface HistoryEntry {
  body: string;
  bodyMode: PostmanBodyMode | 'none';
  formData?: PostmanFormDataItem[];
  headers: string;
  id: string;
  method: string;
  timestamp: number;
  url: string;
}
