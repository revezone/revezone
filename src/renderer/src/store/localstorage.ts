import { TabItem } from '@renderer/types/tabs';

const LOCALSTORAGE_MENU_OPEN_KEYS = 'menu_open_keys';
// const LOCALSTORAGE_MENU_ACTIVE_KEYS = 'menu_active_keys';
const LOCALSTORAGE_CURRENT_FILE_ID = 'current_file_id';
const LOCALSTORAGE_BOARD_CUSTOM_FONTS = 'custom_fonts';
const LOCALSTORAGE_LANG_CODE = 'lang_code';
const LOCALSTORAGE_BOARD_CUSTOM_FONT_SWITCH = 'board_custom_font_switch';
const LOCALSTORAGE_TAB_LIST = 'tab_list';
const LOCALSTORAGE_TAB_INDEX = 'tab_index';

export const getOpenKeysFromLocal = () => {
  const localStr = localStorage.getItem(LOCALSTORAGE_MENU_OPEN_KEYS);
  return localStr ? JSON.parse(localStr) : [];
};

export const setOpenKeysToLocal = (openKeys) => {
  const localStr = JSON.stringify(openKeys);
  localStorage.setItem(LOCALSTORAGE_MENU_OPEN_KEYS, localStr);
};

export const setCurrentFileIdToLocal = (fileId: string | undefined | null) => {
  localStorage.setItem(LOCALSTORAGE_CURRENT_FILE_ID, fileId || '');
};

export const getCurrentFileIdFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_CURRENT_FILE_ID);
};

export const getBoardCustomFontFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_BOARD_CUSTOM_FONTS);
};

export const setBoardCustomFontToLocal = (fontName) => {
  fontName && localStorage.setItem(LOCALSTORAGE_BOARD_CUSTOM_FONTS, fontName);
};

export const addBoardCustomFontToLocal = (fontFamilyName: string) => {
  const customFonts = localStorage.getItem(LOCALSTORAGE_BOARD_CUSTOM_FONTS);
  const arr = customFonts?.split(',');

  if (arr?.includes(fontFamilyName)) return;

  const newCustomFonts = arr ? arr.concat(fontFamilyName).join(',') : fontFamilyName;
  localStorage.setItem(LOCALSTORAGE_BOARD_CUSTOM_FONTS, newCustomFonts);
};

export const setLangCodeToLocal = (langCode: string) => {
  localStorage.setItem(LOCALSTORAGE_LANG_CODE, langCode);
};

export const getLangCodeFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_LANG_CODE);
};

export const getBoardCustomFontSwitchFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_BOARD_CUSTOM_FONT_SWITCH);
};

export const setBoardCustomFontSwitchToLocal = (value) => {
  localStorage.setItem(LOCALSTORAGE_BOARD_CUSTOM_FONT_SWITCH, value);
};

export const setTabListToLocal = (value: string) => {
  localStorage.setItem(LOCALSTORAGE_TAB_LIST, value);
};

export const getTabListFromLocal = (): TabItem[] => {
  const str = localStorage.getItem(LOCALSTORAGE_TAB_LIST);
  return str && JSON.parse(str);
};

export const setTabIndexToLocal = (value: number) => {
  localStorage.setItem(LOCALSTORAGE_TAB_INDEX, String(value));
};

export const getTabIndexFromLocal = () => {
  return Number(localStorage.getItem(LOCALSTORAGE_TAB_INDEX));
};
