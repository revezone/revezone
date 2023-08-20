import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { tabListAtom, tabIndexAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { DEFAULT_EMPTY_TAB_ID } from '@renderer/utils/constant';
import { setTabListToLocal } from '@renderer/store/localstorage';

export default function useTabList() {
  const [tabList, setTabList] = useAtom(tabListAtom);
  const [tabIndex, setTabIndex] = useAtom(tabIndexAtom);

  useEffect(() => {
    setTabListToLocal(JSON.stringify(tabList));
  }, [tabList]);

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
    }
  }, []);

  return { tabIndex, tabList, updateTabList, setTabIndex };
}
