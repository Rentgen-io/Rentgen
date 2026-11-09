import {
  ExportResult,
  ImportResult,
  PostmanCollection,
  ProjectExportResult,
  ProjectImportResult,
  TestResults,
} from 'src/types';

export const exportFile = (payload: {
  defaultPath?: string;
  content: string;
  filters?: Electron.FileFilter[];
}): Promise<{ canceled: boolean; filePath?: string; error?: string }> => window.electronAPI.exportFile(payload);

export const exportPostmanCollection = (collection: PostmanCollection): Promise<ExportResult> =>
  window.electronAPI.exportPostmanCollection(collection);

export const exportProject = (): Promise<ProjectExportResult> => window.electronAPI.exportProject();

export const importPostmanCollection = (): Promise<ImportResult> => window.electronAPI.importPostmanCollection();

export const importProject = (): Promise<ProjectImportResult> => window.electronAPI.importProject();

export const generateCertificate = (results: TestResults): Promise<ExportResult> =>
  window.electronAPI.generateCertificate(results);
