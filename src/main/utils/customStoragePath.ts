import { BrowserWindow, dialog, app, shell } from 'electron';
import { join } from 'path';
import { EVENTS } from '../../preload/events';
import { ensureDir } from './io';
import { writeFileSync, readFileSync } from 'node:fs';
import { getFullPathInfo } from './localFilesStorage';
import { RevezoneFileTree } from '@renderer/types/file';

const USER_DATA_PATH = app.getPath('userData');

const REVEZONE_APP_CONFIG_DIR = join(USER_DATA_PATH, 'revezone_app_config');
const CONFIG_PATH = join(REVEZONE_APP_CONFIG_DIR, 'config.json');

const DEFAULT_LOCAL_FILES_STORAGE_PATH = join(USER_DATA_PATH, 'user_files');

export const customStoragePath = async (mainWindow: BrowserWindow) => {
  const { filePaths: folderPaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  const destPath = folderPaths?.[0];

  if (!destPath) return;

  ensureDir(REVEZONE_APP_CONFIG_DIR);

  writeFileSync(CONFIG_PATH, JSON.stringify({ local_storage_path: destPath }, null, 2));

  mainWindow.webContents.send(EVENTS.customStoragePathSuccess, destPath);
};

export const openStoragePath = async (path: string) => {
  shell.showItemInFolder(path);
};

export const showItemInFolder = async (itemId: string, fileTree: RevezoneFileTree) => {
  const { path } = getFullPathInfo(itemId, fileTree);

  shell.showItemInFolder(path);
};

export const getUserFilesStoragePath = () => {
  try {
    const str = readFileSync(CONFIG_PATH).toString();

    const config = str && JSON.parse(str);

    return config.local_storage_path;
  } catch (err) {
    return DEFAULT_LOCAL_FILES_STORAGE_PATH;
  }
};
