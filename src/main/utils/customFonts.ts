import { dialog } from 'electron';
import { copyFile } from 'node:fs/promises';
import os from 'os';
import fs from 'fs-extra';
import { join } from 'path';
import { notfiy } from './notification';
import { EVENTS } from '../../preload/events';

const FILENAME_REGEX = /\/(([^/]+)\.[a-zA-Z0-9]+)/;
const REVENOTE_APP_FILES_DIR = '.revenote/custom-fonts';

export const loadCustomFont = async (mainWindow) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Fonts', extensions: ['ttf', 'woff2'] }]
  });

  const appDir = join(os.homedir(), REVENOTE_APP_FILES_DIR);

  fs.ensureDirSync(appDir);

  console.log('--- openfile ---', filePaths);

  filePaths.forEach(async (filePath) => {
    try {
      const matches = filePath.match(FILENAME_REGEX);
      const filenameWithSuffix = matches?.[1];
      const fontName = matches?.[2];
      const fontPath = join(appDir, `${filenameWithSuffix}`);
      await copyFile(filePath, fontPath);

      mainWindow.webContents.send(EVENTS.loadCustomFontSuccess, fontName, fontPath);

      notfiy(`Font ${fontName} added!`);
    } catch (err) {
      console.error('copy file error:', err);
    }
  });
};

export const registerCustomFont = (mainWindow, fontName, fontPath) => {
  try {
    const fontData = fs.readFileSync(fontPath);
    const fontUrl = `url(data:font/truetype;base64,${fontData.toString('base64')})`;
    mainWindow.webContents.insertCSS(`@font-face { font-family: '${fontName}'; src: ${fontUrl}; }`);
  } catch (err) {
    console.error(err);
  }
};

export const batchRegisterCustomFonts = (mainWindow, fonts: string) => {
  try {
    const fontsObj = fonts && JSON.parse(fonts);

    fontsObj &&
      Object.entries(fontsObj).forEach(([key, value]) => {
        registerCustomFont(mainWindow, key, value);
      });
  } catch (err) {
    console.error(err);
  }
};
