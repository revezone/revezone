import { dialog, BrowserWindow } from 'electron';
import { copyFile, writeFile } from 'node:fs/promises';
import { join } from 'path';
import { EVENTS } from '../../preload/events';
import fs from 'node:fs';
import { USER_DATA_PATH, ensureDir } from './io';
import { getFilenameFromPath, getFileNameWithoutSuffix, getFileSuffix } from '@renderer/utils/file';

export interface Font {
  name: string;
  nameWithSuffix: string;
  path: string;
}

export interface Manifest {
  activeFonts: string;
}

const FONT_SUFFIXES = ['.ttf', '.woff2', '.otf'];

const CUSTOM_FONTS_DIR = join(USER_DATA_PATH, 'custom_fonts');

export const loadCustomFont = async (mainWindow: BrowserWindow) => {
  if (!mainWindow) {
    return;
  }

  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Fonts', extensions: ['ttf', 'woff2', 'otf'] }]
  });

  ensureDir(CUSTOM_FONTS_DIR);

  console.log('--- openfile ---', filePaths);

  const promises = filePaths.map(async (filePath: string) => {
    try {
      const filenameWithSuffix = getFilenameFromPath(filePath);
      const destPath = join(CUSTOM_FONTS_DIR, `${filenameWithSuffix}`);
      await copyFile(filePath, destPath);

      return {
        name: filenameWithSuffix && getFileNameWithoutSuffix(filenameWithSuffix),
        nameWithSuffix: filenameWithSuffix,
        path: destPath
      };
    } catch (err) {
      console.error('copy file error:', err);
      return undefined;
    }
  });

  const results = await Promise.all(promises);

  const fontNames = results.map((item) => item?.name)?.join(',');

  if (fontNames) {
    const fonts = await getRegisteredFonts();

    mainWindow.webContents.send(EVENTS.loadCustomFontSuccess, fonts);
  }
};

export const removeCustomFont = async (fontPath: string, mainWindow: BrowserWindow) => {
  const result = await fs.unlinkSync(fontPath);

  console.log('removeCustomFont result', result);

  const fonts = await getRegisteredFonts();

  mainWindow.webContents.send(EVENTS.removeCustomFontSuccess, fonts);
};

export const activeCustomFont = (
  mainWindow: BrowserWindow,
  fontName: string,
  fontNameWithSuffix: string
) => {
  if (!(mainWindow && fontNameWithSuffix)) {
    return;
  }

  try {
    let fontType = 'opentype';

    if (fontNameWithSuffix.endsWith('woff2')) {
      fontType = 'woff2';
    }

    const fontPath = join(CUSTOM_FONTS_DIR, fontNameWithSuffix);
    const fontData = fs.readFileSync(fontPath);
    const fontUrl = `url(data:font/${fontType};base64,${fontData.toString(
      'base64'
    )}) format(${fontType})`;

    mainWindow.webContents.insertCSS(
      `@font-face { font-family: '${fontName}'; src: ${fontUrl}; font-display: 'block' }`
    );
  } catch (err) {
    console.error(err);
  }
};

export const batchActiveCustomFonts = (mainWindow: BrowserWindow) => {
  try {
    const fonts = getActiveFonts();

    fonts.forEach((font) => activeCustomFont(mainWindow, font.name, font.nameWithSuffix));
  } catch (err) {
    console.error(err);
  }
};

const isFontFile = (filename: string) => {
  const suffix = getFileSuffix(filename);
  return FONT_SUFFIXES.includes(suffix.toLowerCase());
};

export const serializeFonts = (fontNamesWithSuffix: string[]) => {
  const fonts: Font[] = [];

  fontNamesWithSuffix.forEach((fontName) => {
    if (!fontName || !isFontFile(fontName)) return;

    const fontNameWithoutSuffix = getFileNameWithoutSuffix(fontName);
    const item: Font = {
      name: fontNameWithoutSuffix,
      nameWithSuffix: fontName,
      path: join(CUSTOM_FONTS_DIR, fontName)
    };

    fonts.push(item);
  });

  return fonts;
};

export const getFontNamesWithSuffixFromIO = () => {
  return fs.readdirSync(CUSTOM_FONTS_DIR)?.filter((name) => isFontFile(name));
};

export const getActiveFonts = () => {
  ensureDir(CUSTOM_FONTS_DIR);

  const manifestStr = fs.readFileSync(join(CUSTOM_FONTS_DIR, 'manifest.json'))?.toString();

  const manifest: Manifest = manifestStr && JSON.parse(manifestStr);

  let fontNamesWithSuffix;
  if (manifest) {
    fontNamesWithSuffix = manifest.activeFonts.split(',');
  } else {
    fontNamesWithSuffix = getFontNamesWithSuffixFromIO();
  }

  return serializeFonts(fontNamesWithSuffix);
};

export const getRegisteredFonts = () => {
  ensureDir(CUSTOM_FONTS_DIR);

  const fontNamesWithSuffix = getFontNamesWithSuffixFromIO();

  const fonts = serializeFonts(fontNamesWithSuffix);

  // inject registeredFonts to env to enable renderer get custom fonts
  process.env['registeredFonts'] = JSON.stringify(fonts);

  return fonts;
};

export const switchFontfamily = (mainWindow: BrowserWindow, fontName: string) => {
  if (!fontName) {
    console.log('--- switchFontfamily fontName unexpected undefined ---', fontName);
    return;
  }

  const fonts = getRegisteredFonts();

  const fontNameWithSuffix = fonts.find((font) => font.name === fontName)?.nameWithSuffix;

  if (!fontNameWithSuffix) {
    console.log(
      '--- switchFontfamily fontNameWithSuffix unexpected undefined ---',
      fontNameWithSuffix
    );
    return;
  }

  activeCustomFont(mainWindow, fontName, fontNameWithSuffix);
  updateManifest(JSON.stringify({ activeFonts: fontNameWithSuffix }));
};

export const updateManifest = async (manifest: string) => {
  const fontPath = join(CUSTOM_FONTS_DIR, 'manifest.json');
  await writeFile(fontPath, manifest);
};
