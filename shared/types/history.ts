import { PostmanBody, PostmanHeader } from './postman';

export interface HistoryEntry {
  body: PostmanBody;
  headers: PostmanHeader[];
  id: string;
  method: string;
  timestamp: number;
  url: string;
}
