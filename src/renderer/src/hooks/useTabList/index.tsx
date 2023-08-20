import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { tabListAtom, tabIndexAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { DEFAULT_EMPTY_TAB_ID, DEFAULT_TAB_LIST } from '@renderer/utils/constant';
import {
  getTabListFromLocal,
  setTabListToLocal,
  getTabIndexFromLocal,
  setTabIndexToLocal
} from '@renderer/store/localstorage';

export default function useTabList() {
  const [tabList, setTabList] = useAtom(tabListAtom);
  const [tabIndex, setTabIndex] = useAtom(tabIndexAtom);

  useEffect(() => {
    const tabListFromLocal = getTabListFromLocal();
    setTabList(tabListFromLocal);
    const tabIndexFromLocal = getTabIndexFromLocal();
    setTabIndex(tabIndexFromLocal);
  }, []);

  const updateTabList = useCallback((currentFile, tabList) => {
    if (!currentFile) return;

    const _tabIndex = tabList.findIndex((tab) => tab.id === currentFile.id);

    if (_tabIndex > -1) {
      setTabIndex(_tabIndex);
      console.log('--- setSelectedIndex ---', _tabIndex, tabList);
    } else {
      const newTab: TabItem = {
        id: currentFile.id,
        name: currentFile.name,
        type: 'tab',
        fileType: currentFile.type,
        config: currentFile
      };
      const newTabList: TabItem[] = [
        newTab,
        ...tabList.filter((tab) => tab.id !== DEFAULT_EMPTY_TAB_ID)
      ];

      console.log('--- newTabList ---', newTabList);

      setTabList(newTabList);
      setTabListToLocal(JSON.stringify(newTabList));
      setTabIndexToLocal(_tabIndex > -1 ? _tabIndex : 0);
    }
  }, []);

  const deleteTabList = useCallback(
    (fileId: string, tabList: TabItem[]) => {
      let newTabList = tabList.filter((tab) => tab.id !== fileId);
      newTabList = newTabList?.length === 0 ? DEFAULT_TAB_LIST : newTabList;

      console.log('deleteTabList', fileId, newTabList);

      setTabList(newTabList);

      setTabListToLocal(JSON.stringify(newTabList));
      setTabIndexToLocal(tabIndex);
    },
    [tabIndex]
  );

  return { tabIndex, tabList, updateTabList, setTabIndex, deleteTabList };
}
