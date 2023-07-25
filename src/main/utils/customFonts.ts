import { dialog, Notification } from 'electron';
import { copyFile } from 'node:fs/promises';
import os from 'os';
import fs from 'fs-extra';
import { join } from 'path';

const FILENAME_REGEX = /\/([^/]+\.[a-zA-Z0-9]+)/;
const REVENOTE_APP_FILES_DIR = '.revenote/custom-fonts';

export const loadCustomFonts = async (mainWindow) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Fonts', extensions: ['ttf', 'woff2'] }]
  });

  const appDir = join(os.homedir(), REVENOTE_APP_FILES_DIR);

  fs.ensureDirSync(appDir);

  console.log('--- openfile ---', filePaths);

  filePaths.forEach(async (filePath) => {
    try {
      const filename = filePath.match(FILENAME_REGEX)?.[1];
      console.log('copyfile', join(appDir, `${filename}`));
      await copyFile(filePath, join(appDir, `${filename}`));

      new Notification({ title: 'custom fonts loaded success' }).show();
    } catch (err) {
      console.error('copy file error:', err);
    }
  });
};
