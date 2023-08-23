import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { tabListAtom, tabIndexAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { DEFAULT_EMPTY_TAB_ID } from '@renderer/utils/constant';
import {
  getTabListFromLocal,
  setTabListToLocal,
  getTabIndexFromLocal,
  setTabIndexToLocal
} from '@renderer/store/localstorage';
import useCurrentFile from '../useCurrentFile';

export default function useTabList() {
  const [tabList, setTabList] = useAtom(tabListAtom);
  const [tabIndex, setTabIndex] = useAtom(tabIndexAtom);
  const { updateCurrentFile } = useCurrentFile();

  useEffect(() => {
    const tabListFromLocal = getTabListFromLocal();
    setTabList(tabListFromLocal);
    const tabIndexFromLocal = getTabIndexFromLocal();
    setTabIndex(tabIndexFromLocal);
  }, []);

  const updateTabListWhenCurrentFileChanged = useCallback(
    (currentFile, tabList: TabItem[] = []) => {
      if (!currentFile) return;

      tabList = tabList || [];

      const _tabIndex = tabList.findIndex((tab) => tab.id === currentFile.id);

      if (_tabIndex > -1) {
        setTabIndex(_tabIndex);
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

        setTabList(newTabList);
        setTabListToLocal(JSON.stringify(newTabList));
        setTabIndexToLocal(_tabIndex > -1 ? _tabIndex : 0);
      }
    },
    []
  );

  const deleteTab = useCallback((fileId: string, tabList: TabItem[], tabIndex: number) => {
    const newTabList = tabList.filter((tab) => tab.id !== fileId);

    console.log('deleteTabList', fileId, newTabList);

    setTabList(newTabList);

    setTabListToLocal(JSON.stringify(newTabList));

    const _tabIndex = tabIndex > newTabList.length - 1 ? newTabList.length - 1 : tabIndex;

    console.log('_tabIndex', _tabIndex, newTabList.length);

    setTabIndex(_tabIndex);
    setTabIndexToLocal(_tabIndex);

    const _file = newTabList[_tabIndex];
    updateCurrentFile(_file?.id);
  }, []);

  const renameTabName = useCallback((fileId: string, name: string, tabList: TabItem[]) => {
    const newTabList = tabList.map((tab) => {
      if (tab.id === fileId) {
        const newTab = { ...tab, name };
        if (newTab.config) {
          newTab.config.name = name;
        }
        return newTab;
      }
      return tab;
    });

    console.log('--- newTabList ---', newTabList, tabList, fileId, name);

    setTabList(newTabList);
    // setTabListToLocal(JSON.stringify(newTabList));
  }, []);

  return {
    tabIndex,
    tabList,
    updateTabListWhenCurrentFileChanged,
    setTabList,
    setTabIndex,
    deleteTab,
    renameTabName
  };
}
