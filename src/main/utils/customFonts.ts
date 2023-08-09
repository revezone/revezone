import { dialog, app } from 'electron';
import { copyFile } from 'node:fs/promises';
import { join } from 'path';
import { notify } from './notification';
import { EVENTS } from '../../preload/events';
import fs from 'node:fs';

const USER_DATA_PATH = app.getPath('userData');

const CUSTOM_FONTS_DIR = join(USER_DATA_PATH, 'custom_fonts');

function getFilenameFromPath(path) {
  // 先使用对应操作系统的分隔符切割路径
  const parts = path.split(/[/\\]/);
  // 取最后一个部分作为文件名
  const filename = parts.pop();
  return filename;
}

function removeFileExtension(filename) {
  const lastDotIdx = filename.lastIndexOf('.');
  if (lastDotIdx === -1 || lastDotIdx === 0) {
    // 如果文件名没有扩展名或者以 . 开头，则直接返回原文件名
    return filename;
  } else {
    // 否则截取文件名和扩展名之间的部分
    return filename.slice(0, lastDotIdx);
  }
}

export const loadCustomFont = async (mainWindow) => {
  if (!mainWindow) {
    return;
  }

  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Fonts', extensions: ['ttf', 'woff2'] }]
  });

  notify(`${JSON.stringify(filePaths)}`);

  ensureDir(CUSTOM_FONTS_DIR);

  console.log('--- openfile ---', filePaths);

  const promises = filePaths.map(async (filePath) => {
    try {
      const filenameWithSuffix = getFilenameFromPath(filePath);
      const fontPath = join(CUSTOM_FONTS_DIR, `${filenameWithSuffix}`);
      await copyFile(filePath, fontPath);

      return {
        name: filenameWithSuffix,
        sourcePath: filePath,
        fontPath
      };
    } catch (err) {
      console.error('copy file error:', err);
    }
  });

  const results = await Promise.all(promises);

  const fontNames = results.map((item) => item?.name)?.join(',');

  notify(`Fonts ${fontNames} added! `);

  console.log('--- results ---', results);

  getRegisteredFonts();

  mainWindow.webContents.send(EVENTS.loadCustomFontSuccess, results);
};

export const registerCustomFont = (mainWindow, fontName, fontNameWithSuffix) => {
  if (!(mainWindow && fontNameWithSuffix)) {
    return;
  }

  try {
    const fontPath = join(CUSTOM_FONTS_DIR, fontNameWithSuffix);
    const fontData = fs.readFileSync(fontPath);
    const fontUrl = `url(data:font/truetype;base64,${fontData.toString('base64')})`;

    console.log('--- reigister font ---', fontNameWithSuffix);

    mainWindow.webContents.insertCSS(
      `@font-face { font-family: '${fontName}'; src: ${fontUrl}; font-display: 'block' }`
    );
  } catch (err) {
    console.error(err);
  }
};

export const batchRegisterCustomFonts = (mainWindow) => {
  try {
    const fonts = getRegisteredFonts();
    fonts.forEach((font) => registerCustomFont(mainWindow, font.name, font.nameWithSuffix));
  } catch (err) {
    console.error(err);
  }
};

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const getRegisteredFonts = () => {
  const fontNamesWithSuffix = fs.readdirSync(CUSTOM_FONTS_DIR);

  console.log('--- batchRegisterCustomFonts ---', fontNamesWithSuffix);

  const fonts = fontNamesWithSuffix.map((fontName) => {
    const fontNameWithoutSuffix = removeFileExtension(fontName);
    return {
      name: fontNameWithoutSuffix,
      nameWithSuffix: fontName,
      path: join(CUSTOM_FONTS_DIR, fontName)
    };
  });

  // inject registeredFonts to env to enable renderer get custom fonts
  process.env['registeredFonts'] = JSON.stringify(fonts);

  return fonts;
};
