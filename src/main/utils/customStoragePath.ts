import { BrowserWindow, dialog, app } from 'electron';
import { join } from 'path';
import { EVENTS } from '../../preload/events';
import { ensureDir } from './io';
import { writeFileSync } from 'node:fs';

const USER_DATA_PATH = app.getPath('userData');

const REVEZONE_APP_CONFIG_DIR = join(USER_DATA_PATH, 'revezone_app_config');
const CONFIG_PATH = join(REVEZONE_APP_CONFIG_DIR, 'config.json');

export const customStoragePath = async (mainWindow: BrowserWindow) => {
  const { filePaths: folderPaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  console.log('--- folderPaths ---', folderPaths);

  ensureDir(REVEZONE_APP_CONFIG_DIR);

  writeFileSync(CONFIG_PATH, JSON.stringify({ local_storage_path: folderPaths }, null, 2));

  mainWindow.webContents.send(EVENTS.customStoragePathSuccess, folderPaths);
};
