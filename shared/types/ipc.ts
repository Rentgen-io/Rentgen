import { PostmanCollection } from 'shared/types/postman';

export interface ImportResult {
  canceled?: boolean;
  success?: boolean;
  error?: string;
  collection?: PostmanCollection;
  fileName?: string;
}

export interface ExportResult {
  canceled?: boolean;
  success?: boolean;
  error?: string;
  filePath?: string;
}
