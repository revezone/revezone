import { dialog } from 'electron';
import { copyFile } from 'node:fs/promises';
import os from 'os';
import { join } from 'path';
import { notfiy } from './notification';
import { EVENTS } from '../../preload/events';
import fs from 'node:fs';

const FILENAME_REGEX = /\/(([^/]+)\.[a-zA-Z0-9]+)/;
const REVENOTE_CUSTOM_FONTS_DIR = '.revenote/custom-fonts';
const REVENOTE_CUSTOM_FONTS_MANIFEST_PATH = `${REVENOTE_CUSTOM_FONTS_DIR}/manifest.json`;

const CUSTOM_FONTS_DIR = join(os.homedir(), REVENOTE_CUSTOM_FONTS_DIR);
const CUSTOM_FONTS_MENIFEST_PATH = join(os.homedir(), REVENOTE_CUSTOM_FONTS_MANIFEST_PATH);

export const loadCustomFont = async (mainWindow) => {
  if (!mainWindow) {
    return;
  }

  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Fonts', extensions: ['ttf', 'woff2'] }]
  });

  ensureDir(CUSTOM_FONTS_DIR);

  console.log('--- openfile ---', filePaths);

  filePaths.forEach(async (filePath) => {
    try {
      const matches = filePath.match(FILENAME_REGEX);
      const filenameWithSuffix = matches?.[1];
      const fontName = matches?.[2];
      const fontPath = join(CUSTOM_FONTS_DIR, `${filenameWithSuffix}`);
      await copyFile(filePath, fontPath);

      mainWindow.webContents.send(EVENTS.loadCustomFontSuccess, fontName, fontPath);

      notfiy(`Font ${fontName} added!`);
    } catch (err) {
      console.error('copy file error:', err);
    }
  });
};

export const registerCustomFont = (mainWindow, fontName, fontPath) => {
  if (!(mainWindow && fontName && fontPath)) {
    return;
  }

  try {
    const fontData = fs.readFileSync(fontPath);
    const fontUrl = `url(data:font/truetype;base64,${fontData.toString('base64')})`;

    mainWindow.webContents.insertCSS(`@font-face { font-family: '${fontName}'; src: ${fontUrl}; }`);

    console.log('--- registerCustomFont ---', fontName, fontPath);
  } catch (err) {
    console.error(err);
  }
};

export const batchRegisterCustomFonts = (mainWindow) => {
  try {
    const config = getCustomFontsConfig();
    const fonts = config.fonts;

    console.log('--- batchRegisterCustomFonts ---', fonts);

    fonts &&
      Object.entries(fonts).map(([key, value]) => {
        return registerCustomFont(mainWindow, key, value);
      });

    // mainWindow.webContents.insertCSS(
    //   `html body :where(.css-dev-only-do-not-override-14wwjjs).ant-menu {font-family: 'YeZiGongChangCangNanShouJi-2'}`
    // );
  } catch (err) {
    console.error(err);
  }
};

export const storeCustomFontConfig = (fontName: string, fontPath: string) => {
  try {
    ensureDir(CUSTOM_FONTS_DIR);
    const config = getCustomFontsConfig();
    config.fonts[fontName] = fontPath;
    fs.writeFileSync(CUSTOM_FONTS_MENIFEST_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error(err);
  }
};

export const getCustomFontsConfig = () => {
  try {
    const configBuffer =
      fs.existsSync(CUSTOM_FONTS_MENIFEST_PATH) && fs.readFileSync(CUSTOM_FONTS_MENIFEST_PATH);
    const config = configBuffer ? JSON.parse(configBuffer.toString()) : { fonts: {} };

    return config;
  } catch (err) {
    console.error(err);
  }
};

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
