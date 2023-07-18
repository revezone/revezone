const LOCALSTORAGE_MENU_OPEN_KEYS = 'menu_open_keys';
const LOCALSTORAGE_MENU_ACTIVE_KEYS = 'menu_active_keys';
const LOCALSTORAGE_CURRENT_FILE_ID = 'current_file_id';

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

export const setCurrentFileIdToLocal = (fileId: string) => {
  localStorage.setItem(LOCALSTORAGE_CURRENT_FILE_ID, fileId);
};

export const getCurrentFileIdFromLocal = () => {
  return localStorage.getItem(LOCALSTORAGE_CURRENT_FILE_ID);
};
