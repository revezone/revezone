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
import { RevezoneFile } from '@renderer/types/file';

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
    (currentFile: RevezoneFile | undefined | null, tabList: TabItem[] = []) => {
      if (!currentFile) return;

      tabList = tabList || [];

      const _tabIndex = tabList.findIndex((tab) => tab.id === currentFile.id);

      console.log(
        '--- updateTabListWhenCurrentFileChanged _tabIndex ---',
        _tabIndex,
        currentFile,
        tabList
      );

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
        setTabIndex(0);
        setTabIndexToLocal(0);
      }
    },
    []
  );

  const deleteTab = useCallback(
    async (fileId: string, tabList: TabItem[], currentTabIndex: number) => {
      const newTabList = tabList.filter((tab) => tab.id !== fileId);

      console.log('deleteTabList', fileId, newTabList);

      setTabList(newTabList);

      setTabListToLocal(JSON.stringify(newTabList));

      const _tabIndex =
        currentTabIndex > newTabList.length - 1 ? newTabList.length - 1 : currentTabIndex;

      console.log('_tabIndex', _tabIndex, currentTabIndex, newTabList.length);

      setTabIndex(_tabIndex);
      setTabIndexToLocal(_tabIndex);

      const fileInfo = newTabList[_tabIndex]?.config;

      updateCurrentFile(fileInfo);
    },
    []
  );

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
    setTabListToLocal(JSON.stringify(newTabList));
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
