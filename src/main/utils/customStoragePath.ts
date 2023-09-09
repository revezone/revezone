import { BrowserWindow, dialog, app } from 'electron';
import { join } from 'path';
import { EVENTS } from '../../preload/events';
import { ensureDir } from './io';
import { writeFileSync, readFileSync } from 'node:fs';

const USER_DATA_PATH = app.getPath('userData');

const REVEZONE_APP_CONFIG_DIR = join(USER_DATA_PATH, 'revezone_app_config');
const CONFIG_PATH = join(REVEZONE_APP_CONFIG_DIR, 'config.json');

const DEFAULT_LOCAL_FILES_STORAGE_PATH = join(USER_DATA_PATH, 'user_files');

export const customStoragePath = async (mainWindow: BrowserWindow) => {
  const { filePaths: folderPaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  const destPath = folderPaths?.[0];

  console.log('--- destPath ---', destPath);

  if (!destPath) return;

  ensureDir(REVEZONE_APP_CONFIG_DIR);

  writeFileSync(CONFIG_PATH, JSON.stringify({ local_storage_path: folderPaths }, null, 2));

  mainWindow.webContents.send(EVENTS.customStoragePathSuccess, folderPaths);
};

export const openStoragePath = async (mainWindow: BrowserWindow, path: string) => {
  await dialog.showOpenDialog(mainWindow, {
    defaultPath: path
  });
};

export const getLocalFilesStoragePath = () => {
  const config = JSON.parse(readFileSync(CONFIG_PATH).toString());

  return config.local_storage_path || DEFAULT_LOCAL_FILES_STORAGE_PATH;
};
