import { useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import { tabListAtom, tabIndexAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';

export default function useTabList() {
  const [tabList, setTabList] = useAtom(tabListAtom);
  const [tabIndex, setTabIndex] = useAtom(tabIndexAtom);

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
      const newTabList = [newTab, ...tabList];

      console.log('--- newTabList ---', newTabList);

      setTabList(newTabList);
    }
  }, []);

  return { tabIndex, tabList, updateTabList, setTabIndex };
}
