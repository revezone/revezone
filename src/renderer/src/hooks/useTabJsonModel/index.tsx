import { useCallback, useEffect, MutableRefObject } from 'react';
import { useAtom } from 'jotai';
import { tabJsonModelAtom, tabModelAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { DEFAULT_EMPTY_TAB_ID } from '@renderer/utils/constant';
import { getTabJsonModelFromLocal, setTabJsonModelToLocal } from '@renderer/store/localstorage';
import useCurrentFile from '../useCurrentFile';
import { RevezoneFile } from '@renderer/types/file';

import {
  IJsonModel,
  IJsonRowNode,
  IJsonTabSetNode,
  IJsonTabNode,
  DockLocation,
  Layout,
  Model,
  Actions
} from 'flexlayout-react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';

export default function useTabJsonModel() {
  const [tabJsonModel, setTabJsonModel] = useAtom(tabJsonModelAtom);
  const [model] = useAtom(tabModelAtom);
  const { updateCurrentFile } = useCurrentFile();

  useEffect(() => {
    const tabJsonModelFromLocal = getTabJsonModelFromLocal();
    setTabJsonModel(tabJsonModelFromLocal);
  }, []);

  const getTabList = useCallback(
    (
      json: IJsonRowNode | IJsonTabSetNode | IJsonTabNode,
      tabList: IJsonTabNode[] = []
    ): IJsonTabNode[] => {
      if (json.type === 'tab') {
        tabList.push(json);
      } else {
        // @ts-ignore
        json.children?.forEach((child: IJsonRowNode | IJsonTabSetNode | IJsonTabNode) => {
          getTabList(child, tabList);
        });
      }

      return tabList;
    },
    []
  );

  const getActiveTabset = useCallback((tabJsonModel: IJsonModel): IJsonTabSetNode => {
    const layoutChildren = tabJsonModel.layout.children as IJsonTabSetNode[];

    let activeTabset: IJsonTabSetNode = layoutChildren[0];

    for (const child of layoutChildren) {
      if (child.active) {
        activeTabset = child;
        break;
      }
    }

    return activeTabset;
  }, []);

  const getSelectedTab = useCallback((tabJsonModel: IJsonModel) => {
    const layoutChildren = tabJsonModel.layout.children as IJsonTabSetNode[];

    let selectedTab: IJsonTabNode = layoutChildren[0].children[0];

    for (const child of layoutChildren) {
      if (child.active) {
        selectedTab = child.children[child.selected || 0];
        break;
      }
    }

    return selectedTab;
  }, []);

  const updateTabJsonModelWhenCurrentFileChanged = useCallback(
    (currentFile: RevezoneFile | undefined | null, model: Model | undefined) => {
      if (!currentFile || !model) return;

      const tabJsonModel = model.toJson();

      const tabList = getTabList(tabJsonModel.layout);

      const _tabIndex = tabList.findIndex((tab) => tab.id === currentFile.id);

      if (_tabIndex < 0) {
        addTab(currentFile, model);

        const newTabJsonModel = model.toJson();

        setTabJsonModel(newTabJsonModel);
        setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));
      } else {
        model.doAction(Actions.selectTab(currentFile.id));
      }
    },
    []
  );

  const addTab = useCallback((currentFile: RevezoneFile, model: Model | undefined) => {
    if (!model) return;

    const newTabItem: TabItem = {
      id: currentFile.id,
      name: currentFile.name,
      type: 'tab',
      fileType: currentFile.type,
      config: currentFile
    };

    const json = model.toJson();

    const activeTabset = getActiveTabset(json);

    model.doAction(
      Actions.addNode(newTabItem, activeTabset.id || '', DockLocation.CENTER, 0, true)
    );
  }, []);

  const deleteTab = useCallback(async (fileId: string, model: Model | undefined) => {
    if (!model) return;

    model.doAction(Actions.deleteTab(fileId));

    const newTabJsonModel = model.toJson();

    console.log('deleteTabJsonModel', fileId, newTabJsonModel);
    setTabJsonModel(newTabJsonModel);
    setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));

    const selectedTab = getSelectedTab(newTabJsonModel);

    const currentFile = selectedTab.id
      ? await fileTreeIndexeddbStorage.getFile(selectedTab.id)
      : undefined;

    updateCurrentFile(currentFile);
  }, []);

  const renameTabName = useCallback((fileId: string, name: string, model: Model | undefined) => {
    if (!model) return;

    model.doAction(Actions.renameTab(fileId, name));

    // const newTabJsonModel = tabJsonModel.map((tab) => {
    //   if (tab.id === fileId) {
    //     const newTab = { ...tab, name };
    //     if (newTab.config) {
    //       newTab.config.name = name;
    //     }
    //     return newTab;
    //   }
    //   return tab;
    // });

    const newTabJsonModel = model.toJson();

    console.log('--- newTabJsonModel ---', newTabJsonModel, tabJsonModel, fileId, name);
    setTabJsonModel(newTabJsonModel);
    setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));
  }, []);

  return {
    tabJsonModel,
    model,
    updateTabJsonModelWhenCurrentFileChanged,
    setTabJsonModel,
    deleteTab,
    renameTabName
  };
}
