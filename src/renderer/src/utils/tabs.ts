import { getTabListFromLocal } from '@renderer/store/localstorage';
import { DEFAULT_TAB_LIST } from '@renderer/utils/constant';

export const getInitialTabList = () => {
  const tabListFromLocal = getTabListFromLocal();

  return tabListFromLocal || DEFAULT_TAB_LIST;
};
