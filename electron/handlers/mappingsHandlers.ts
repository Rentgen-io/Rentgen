import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { defaultMappings } from 'shared/defaults';
import type { MappingsState } from 'shared/types/mappings';

const getMappingsPath = () => path.join(app.getPath('userData'), 'mappings.json');

export function registerMappingsHandlers(): void {
  ipcMain.handle('load-mappings', () => {
    try {
      const mappingsPath = getMappingsPath();
      if (fs.existsSync(mappingsPath)) return JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
    } catch (error) {
      console.error(error);
    }

    return defaultMappings;
  });
  ipcMain.on('save-mappings', (_, mappings: MappingsState) => {
    try {
      fs.writeFileSync(getMappingsPath(), JSON.stringify(mappings, null, 2), 'utf-8');
    } catch (error) {
      console.error(error);
    }
  });
}
