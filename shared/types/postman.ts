import { PreEvaluation } from './pre-evaluation';

// Rentgen's collection model (saved to disk), in a Postman-like shape. The Postman v2.1 file format used for import
// and export is described in shared/converters/postman.ts.
export type PostmanBodyMode = 'formdata' | 'raw' | 'urlencoded';

export interface PostmanHeader {
  key: string;
  value: string;
}

export interface PostmanBody {
  mode?: PostmanBodyMode;
  raw?: string;
  formdata?: PostmanFormDataItem[];
  urlencoded?: PostmanUrlencodedItem[];
}

export interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: string;
}

export interface PostmanItem {
  id: string;
  name: string;
  preEvaluation?: PreEvaluation;
  request: PostmanRequest;
}

export interface PostmanFolder {
  id: string;
  name: string;
  item: PostmanItem[];
}

export interface PostmanCollectionInfo {
  name: string;
  description: string;
  schema: string;
}

export interface PostmanCollection {
  info: PostmanCollectionInfo;
  item: PostmanFolder[];
}

export interface PostmanFormDataItem {
  key: string;
  value?: string;
  type?: 'text' | 'file';
  src?: string | string[] | null;
  disabled?: boolean;
}

export interface PostmanUrlencodedItem {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}
