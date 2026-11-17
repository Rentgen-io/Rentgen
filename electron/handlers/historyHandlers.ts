import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { isCurrentHistoryEntry } from 'shared/utils/history';

const getHistoryPath = () => path.join(app.getPath('userData'), 'history.json');

export function registerHistoryHandlers(): void {
  ipcMain.handle('load-history', async () => {
    const historyPath = getHistoryPath();
    try {
      if (fs.existsSync(historyPath)) {
        const entries: unknown = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        if (!Array.isArray(entries)) return [];

        // Entries of the former format are dropped, and the file rewritten without them, so this happens only once
        const currentEntries = entries.filter(isCurrentHistoryEntry);
        if (currentEntries.length !== entries.length)
          fs.writeFileSync(historyPath, JSON.stringify(currentEntries, null, 2), 'utf-8');

        return currentEntries;
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
    return [];
  });

  ipcMain.handle('save-history', async (_, entries) => {
    const historyPath = getHistoryPath();
    try {
      fs.writeFileSync(historyPath, JSON.stringify(entries, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('Error saving history:', error);
      return { success: false, error: String(error) };
    }
  });
}
