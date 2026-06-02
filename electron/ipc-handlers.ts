import { app, ipcMain } from 'electron';

export function setupIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
}
