const LOCALSTORAGE_MENU_OPEN_KEYS = 'menu_open_keys';
const LOCALSTORAGE_MENU_ACTIVE_KEYS = 'menu_active_keys';
const LOCALSTORAGE_CURRENT_FILE_ID = 'current_file_id';
const LOCALSTORAGE_CUSTOM_FONTS = 'custom_fonts';
const LOCALSTORAGE_LANG_CODE = 'lang_code';

export const getOpenKeysFromLocal = () => {
  const localStr = localStorage.getItem(LOCALSTORAGE_MENU_OPEN_KEYS);
  return localStr ? JSON.parse(localStr) : [];
};

export const getSelectedKeysFromLocal = () => {
  const localStr = localStorage.getItem(LOCALSTORAGE_MENU_ACTIVE_KEYS);
  return localStr ? JSON.parse(localStr) : [];
};

export const setOpenKeysToLocal = (openKeys) => {
  const localStr = JSON.stringify(openKeys);
  localStorage.setItem(LOCALSTORAGE_MENU_OPEN_KEYS, localStr);
};

export const setSelectedKeysToLocal = (SelectedKeys) => {
  const localStr = JSON.stringify(SelectedKeys);
  localStorage.setItem(LOCALSTORAGE_MENU_ACTIVE_KEYS, localStr);
};

export const setCurrentFileIdToLocal = (fileId: string | undefined | null) => {
  localStorage.setItem(LOCALSTORAGE_CURRENT_FILE_ID, fileId || '');
};

export const getCurrentFileIdFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_CURRENT_FILE_ID);
};

export const addCustomFontToLocal = (fontFamilyName: string) => {
  const customFonts = localStorage.getItem(LOCALSTORAGE_CUSTOM_FONTS);
  const arr = customFonts?.split(',');

  if (arr?.includes(fontFamilyName)) return;

  const newCustomFonts = arr ? arr.concat(fontFamilyName).join(',') : fontFamilyName;
  localStorage.setItem(LOCALSTORAGE_CUSTOM_FONTS, newCustomFonts);
};

export const setLangCodeToLocal = (langCode: string) => {
  localStorage.setItem(LOCALSTORAGE_LANG_CODE, langCode);
};

export const getLangCodeFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_LANG_CODE);
};
