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
  /** A muted request is skipped when running its folder. */
  muted?: boolean;
  name: string;
  preEvaluation?: PreEvaluation;
  request: PostmanRequest;
}

/** A folder holds requests and subfolders, in any order (like Postman). */
export interface PostmanFolder {
  id: string;
  name: string;
  item: PostmanNode[];
}

/** An entry of a folder: a request or a subfolder. Tell them apart with isFolder (shared/utils/collection). */
export type PostmanNode = PostmanItem | PostmanFolder;

export interface PostmanCollectionInfo {
  name: string;
  description: string;
  schema: string;
}

/** The top level holds only folders; requests and subfolders are inside them. */
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
