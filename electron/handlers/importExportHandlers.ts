import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { postmanToRentgen, rentgenToPostman, validatePostmanCollection } from 'shared/utils/postman-converter';
import type { ExportResult, ImportResult } from 'shared/types/ipc';
import type { PostmanCollection } from 'shared/types/postman';

export function registerImportExportHandlers(): void {
  // Import Postman collection from file
  ipcMain.handle('import-postman-collection', async (): Promise<ImportResult> => {
    const result = await dialog.showOpenDialog({
      title: 'Import Collection',
      filters: [
        { name: 'Rentgen Collection', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return { canceled: true };

    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      const parsed = JSON.parse(content);

      // Validate
      const validation = validatePostmanCollection(parsed);
      if (!validation.valid) return { error: validation.error };

      // Convert to Rentgen format
      const { collection, warnings } = postmanToRentgen(parsed);

      return {
        success: true,
        collection,
        warnings,
        fileName: path.basename(result.filePaths[0]),
      };
    } catch (error) {
      if (error instanceof SyntaxError) return { error: 'Invalid JSON file' };

      return { error: String(error) };
    }
  });

  // Export collection to Postman format
  ipcMain.handle('export-postman-collection', async (_, collection: PostmanCollection): Promise<ExportResult> => {
    const fileName = collection.info.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const result = await dialog.showSaveDialog({
      title: 'Export Collection',
      defaultPath: `${fileName}-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.collection.json`,
      filters: [{ name: 'Rentgen Collection', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    try {
      const postmanCollection = rentgenToPostman(collection);
      fs.writeFileSync(result.filePath, JSON.stringify(postmanCollection, null, 2), 'utf-8');

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { error: String(error) };
    }
  });

  // Export file
  ipcMain.handle(
    'export-file',
    async (_, payload: { defaultPath?: string; content: string; filters?: Electron.FileFilter[] }) => {
      const {
        defaultPath = `rentgen-file-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.json`,
        content,
        filters,
      } = payload || {};

      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: filters ?? [{ name: 'Rentgen File', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) return { canceled: true };

      try {
        fs.writeFileSync(result.filePath, content, 'utf-8');
      } catch (error) {
        return { canceled: false, error: String(error) };
      }

      return { canceled: false, filePath: result.filePath };
    },
  );

  // Pick files for form-data fields: only their paths are returned, the files are read when the request is sent
  ipcMain.handle('select-files', async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });

    return result.canceled ? [] : result.filePaths;
  });
}
