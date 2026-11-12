import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { tabJsonModelAtom, tabModelAtom } from '@renderer/store/jotai';
import { TabItem } from '@renderer/types/tabs';
import { setTabJsonModelToLocal } from '@renderer/store/localstorage';
import useCurrentFile from '../useCurrentFile';
import { RevezoneFile } from '@renderer/types/file';
import {
  IJsonRowNode,
  IJsonTabSetNode,
  IJsonTabNode,
  DockLocation,
  Model,
  Actions,
  TabSetNode
} from 'flexlayout-react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { WELCOME_TAB_ITEM } from '@renderer/utils/constant';

export function getActiveTabset(model: Model) {
  let tabset = model.getActiveTabset();
  if (!tabset) {
    model.visitNodes((node) => {
      if (!tabset && node instanceof TabSetNode) tabset = node;
    });
  }
  return tabset;
}

export default function useTabJsonModel() {
  const [tabJsonModel, setTabJsonModel] = useAtom(tabJsonModelAtom);
  const [model] = useAtom(tabModelAtom);
  const { updateCurrentFile } = useCurrentFile();

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

  const updateTabJsonModelWhenCurrentFileChanged = useCallback(
    (currentFile: RevezoneFile | undefined | null, tabModel: Model | undefined) => {
      if (!currentFile || !tabModel) return;

      const tabJsonModel = tabModel.toJson();

      const tabList = getTabList(tabJsonModel.layout);

      const _tabIndex = tabList.findIndex((tab) => tab.id === currentFile.id);

      if (_tabIndex < 0) {
        addTab(currentFile, tabModel);

        const newTabJsonModel = tabModel.toJson();

        setTabJsonModel(newTabJsonModel);
        setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));
      } else {
        tabModel.doAction(Actions.selectTab(currentFile.id));
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
      config: currentFile
    };

    const activeTabset = getActiveTabset(model);
    if (!activeTabset) return;

    model.doAction(Actions.addNode(newTabItem, activeTabset.getId(), DockLocation.CENTER, 0, true));
  }, []);

  const switchToWelcomePage = useCallback(() => {
    if (!model) return;

    const json = model.toJson();
    const tabList = json && getTabList(json.layout);

    const welcomeTab = tabList?.find((tab) => tab.config.type === 'welcome');

    if (welcomeTab?.id) {
      model.doAction(Actions.selectTab(welcomeTab.id));
    } else {
      addTab(WELCOME_TAB_ITEM.config, model);
    }
  }, [model]);

  const deleteTab = useCallback(async (fileId: string, model: Model | undefined) => {
    if (!model) return;

    model.doAction(Actions.deleteTab(fileId));

    const newTabJsonModel = model.toJson();

    setTabJsonModel(newTabJsonModel);
    setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));

    const selectedTab = getActiveTabset(model)?.getSelectedNode();
    const currentFile = selectedTab
      ? await fileTreeIndexeddbStorage.getFile(selectedTab.getId())
      : undefined;

    updateCurrentFile(currentFile);
  }, []);

  const renameTabName = useCallback((fileId: string, name: string, model: Model | undefined) => {
    if (!model) return;

    model.doAction(Actions.renameTab(fileId, name));

    const newTabJsonModel = model.toJson();

    setTabJsonModel(newTabJsonModel);
    setTabJsonModelToLocal(JSON.stringify(newTabJsonModel));
  }, []);

  return {
    tabJsonModel,
    model,
    addTab,
    switchToWelcomePage,
    updateTabJsonModelWhenCurrentFileChanged,
    setTabJsonModel,
    deleteTab,
    renameTabName,
    getTabList
  };
}
