const LOCALSTORAGE_MENU_OPEN_KEYS = 'menu_open_keys';
const LOCALSTORAGE_MENU_ACTIVE_KEYS = 'menu_active_keys';

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
