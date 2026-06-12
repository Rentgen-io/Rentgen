import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { initialState, MappingsState } from '../../src/store/slices/mappingsSlice';

const getMappingsPath = () => path.join(app.getPath('userData'), 'mappings.json');

export function registerMappingsHandlers(): void {
  ipcMain.handle('load-mappings', () => {
    try {
      const mappingsPath = getMappingsPath();
      if (fs.existsSync(mappingsPath)) return JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
    } catch (error) {
      console.error(error);
    }

    return initialState;
  });
  ipcMain.on('save-mappings', (_, mappings: MappingsState) => {
    try {
      fs.writeFileSync(getMappingsPath(), JSON.stringify(mappings, null, 2), 'utf-8');
    } catch (error) {
      console.error(error);
    }
  });
}
