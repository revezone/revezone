import { RevezoneFile } from '@renderer/types/file';
import { IJsonModel } from 'flexlayout-react';
import { DEFAULT_TAB_JSON_MODEL } from '@renderer/utils/constant';

const LOCALSTORAGE_MENU_OPEN_KEYS = 'menu_open_keys';
const LOCALSTORAGE_MENU_SELECTED_KEYS = 'menu_selected_keys';
// const LOCALSTORAGE_MENU_ACTIVE_KEYS = 'menu_active_keys';
const LOCALSTORAGE_CURRENT_FILE = 'current_file';
const LOCALSTORAGE_BOARD_CUSTOM_FONTS = 'custom_fonts';
const LOCALSTORAGE_LANG_CODE = 'lang_code';
const LOCALSTORAGE_BOARD_CUSTOM_FONT_SWITCH = 'board_custom_font_switch';
const LOCALSTORAGE_TAB_JSON_MODEL = 'tab_json_model';
const LOCALSTORAGE_RENAMING_MENU_ITEM_ID = 'renaming_menu_item_id';
const LOCALSTORAGE_OLD_MENU_INDEXEDDB_SYNC = 'old_menu_indexeddb_synced';
const LOCALSTORAGE_IS_USER_GUIDE_SHOWED = 'is_user_guide_showed';

export const getOpenKeysFromLocal = (): string[] => {
  const localStr = localStorage.getItem(LOCALSTORAGE_MENU_OPEN_KEYS);
  return localStr ? JSON.parse(localStr) : [];
};

export const setOpenKeysToLocal = (openKeys: string[]) => {
  const localStr = JSON.stringify(openKeys);
  localStorage.setItem(LOCALSTORAGE_MENU_OPEN_KEYS, localStr);
};

export const getSelectedKeysFromLocal = (): string[] => {
  const localStr = localStorage.getItem(LOCALSTORAGE_MENU_SELECTED_KEYS);
  return localStr ? JSON.parse(localStr) : [];
};

export const setSelectedKeysToLocal = (selectedKeys: string[]) => {
  const localStr = JSON.stringify(selectedKeys);
  localStorage.setItem(LOCALSTORAGE_MENU_SELECTED_KEYS, localStr);
};

export const setCurrentFileToLocal = (file: RevezoneFile | undefined) => {
  const str = file ? JSON.stringify(file) : '';

  localStorage.setItem(LOCALSTORAGE_CURRENT_FILE, str);
};

export const getCurrentFileFromLocal = (): RevezoneFile => {
  const localStr = localStorage.getItem(LOCALSTORAGE_CURRENT_FILE);
  return localStr && JSON.parse(localStr);
};

export const getBoardCustomFontFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_BOARD_CUSTOM_FONTS);
};

export const setBoardCustomFontToLocal = (fontName: string) => {
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

export const setBoardCustomFontSwitchToLocal = (value: string) => {
  localStorage.setItem(LOCALSTORAGE_BOARD_CUSTOM_FONT_SWITCH, value);
};

export const setTabJsonModelToLocal = (value: string) => {
  localStorage.setItem(LOCALSTORAGE_TAB_JSON_MODEL, value);
};

export const getTabJsonModelFromLocal = (): IJsonModel => {
  const str = localStorage.getItem(LOCALSTORAGE_TAB_JSON_MODEL);
  return (str && JSON.parse(str)) || DEFAULT_TAB_JSON_MODEL;
};

export const setRenamingMenuItemIdToLocal = (id: string) => {
  localStorage.setItem(LOCALSTORAGE_RENAMING_MENU_ITEM_ID, id);
};

export const getRenamingMenuItemIdFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_RENAMING_MENU_ITEM_ID);
};

export const setOldMenuIndexeddbSynced = (value: string) => {
  localStorage.setItem(LOCALSTORAGE_OLD_MENU_INDEXEDDB_SYNC, value);
};

export const getOldMenuIndexeddbSynced = (): boolean => {
  const str = localStorage.getItem(LOCALSTORAGE_OLD_MENU_INDEXEDDB_SYNC);
  return Boolean(str);
};

export const setIsUserGuideShowed = (showed: boolean) => {
  localStorage.setItem(LOCALSTORAGE_IS_USER_GUIDE_SHOWED, String(showed));
};

export const getIsUserGuideShowed = (): boolean => {
  // Do not show user guide in dev mode
  if (window.location.host.startsWith('localhost')) {
    return true;
  }
  const localStr = localStorage.getItem(LOCALSTORAGE_IS_USER_GUIDE_SHOWED);
  return Boolean(localStr);
};
