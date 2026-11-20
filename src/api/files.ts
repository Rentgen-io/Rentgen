import { ExportResult, ImportResult } from 'shared/types/ipc';
import { PostmanCollection } from 'shared/types/postman';
import { ProjectExportResult, ProjectImportResult } from 'shared/types/project';
import { TestResults } from 'shared/types/testing';

export const exportFile = (payload: {
  defaultPath?: string;
  content: string;
  filters?: Electron.FileFilter[];
}): Promise<{ canceled: boolean; filePath?: string; error?: string }> => window.electronAPI.exportFile(payload);

export const exportPostmanCollection = (collection: PostmanCollection): Promise<ExportResult> =>
  window.electronAPI.exportPostmanCollection(collection);

export const exportProject = (): Promise<ProjectExportResult> => window.electronAPI.exportProject();

export const generateCertificate = (results: TestResults): Promise<ExportResult> =>
  window.electronAPI.generateCertificate(results);

export const importPostmanCollection = (): Promise<ImportResult> => window.electronAPI.importPostmanCollection();

export const importProject = (): Promise<ProjectImportResult> => window.electronAPI.importProject();

export const prepareTestFiles = (): Promise<string> => window.electronAPI.prepareTestFiles();

export const selectFiles = (): Promise<string[]> => window.electronAPI.selectFiles();
