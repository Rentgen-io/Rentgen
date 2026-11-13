import { PostmanBody } from './postman';

export interface HistoryEntry {
  body: PostmanBody;
  headers: string;
  id: string;
  method: string;
  timestamp: number;
  url: string;
}
