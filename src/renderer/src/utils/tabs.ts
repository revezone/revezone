import { getTabListFromLocal } from '@renderer/store/localstorage';

export const getInitialTabList = () => {
  const tabListFromLocal = getTabListFromLocal();

  return tabListFromLocal || [];
};
