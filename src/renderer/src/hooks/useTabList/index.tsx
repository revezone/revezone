import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { tabListAtom, tabIndexAtom, currentFileAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { DEFAULT_EMPTY_TAB_ID } from '@renderer/utils/constant';
import {
  getTabListFromLocal,
  setTabListToLocal,
  getTabIndexFromLocal,
  setTabIndexToLocal
} from '@renderer/store/localstorage';

export default function useTabList() {
  const [tabList, setTabList] = useAtom(tabListAtom);
  const [tabIndex, setTabIndex] = useAtom(tabIndexAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);

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

  const deleteTabList = useCallback((fileId: string, tabList: TabItem[], tabIndex: number) => {
    const newTabList = tabList.filter((tab) => tab.id !== fileId);

    console.log('deleteTabList', fileId, newTabList);

    setTabList(newTabList);

    setTabListToLocal(JSON.stringify(newTabList));

    const _tabIndex = tabIndex > newTabList.length - 1 ? newTabList.length - 1 : tabIndex;

    console.log('_tabIndex', _tabIndex, newTabList.length);

    setTabIndex(_tabIndex);
    setTabIndexToLocal(_tabIndex);

    if (_tabIndex < 0) {
      setCurrentFile(undefined);
    }
  }, []);

  return { tabIndex, tabList, updateTabList, setTabIndex, deleteTabList };
}
