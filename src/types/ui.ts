import { IntegrityStatus, PostmanCollection, ProjectData, ProjectMeta } from './index';

export type SidebarTab = 'collections' | 'environments' | 'history' | null;

export interface ImportConflict {
  type: 'collection' | 'folder' | 'request';
  existingName: string;
  importedName: string;
  folderId?: string;
  folderName?: string;
  requestMethod?: string;
  requestUrl?: string;
}

export interface ImportConflictSummary {
  hasConflicts: boolean;
  collectionNameMatch: boolean;
  folderConflicts: ImportConflict[];
  requestConflicts: ImportConflict[];
}

export interface ImportConflictModalState {
  isOpen: boolean;
  importedCollection: PostmanCollection | null;
  conflictSummary: ImportConflictSummary | null;
  warnings: string[];
}

export interface SetAsDynamicVariableModalState {
  isOpen: boolean;
  initialSelector: string;
  initialValue: string;
  requestId: string;
  collectionName: string;
  requestName: string;
  source: 'body' | 'header';
}

export interface ProjectImportConfirmModalState {
  isOpen: boolean;
  data: ProjectData | null;
  meta: ProjectMeta | null;
  integrityStatus: IntegrityStatus | null;
  fileName: string;
}
