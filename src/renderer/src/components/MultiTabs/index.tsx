import { IJsonModel, Layout, Model } from 'flexlayout-react';
import type { Action } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import NoteEditor from '@renderer/components/NoteEditor';
import RevedrawApp from '../RevedrawApp';
import WelcomePage from '../WelcomePage';
import { useCallback, useEffect, useState } from 'react';
import useTabList from '@renderer/hooks/useTabList';

import './index.css';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { currentFileAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { setTabIndexToLocal } from '@renderer/store/localstorage';

export default function MultiTabs() {
  const { tabIndex, tabList, deleteTabList, setTabIndex } = useTabList();
  const [model, setModel] = useState<Model>();
  const [, setCurrentFile] = useAtom(currentFileAtom);

  console.log('--- tabIndex ---', tabIndex);

  useEffect(() => {
    const json: IJsonModel = {
      global: {},
      layout: {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            weight: 10,
            selected: tabIndex,
            children: tabList
          }
        ]
      }
    };

    const _model = Model.fromJson(json);

    setModel(_model);
  }, [tabIndex, tabList]);

  const renderContent = useCallback((file) => {
    console.log('--- renderContent ---', file);

    switch (file?.type) {
      case 'note':
        return <NoteEditor file={file} />;
      case 'board':
        return <RevedrawApp file={file} />;
      default:
        return <WelcomePage />;
    }
  }, []);

  const factory = useCallback((node) => {
    const file = node.getConfig();

    return <div className="tab_content">{renderContent(file)}</div>;
  }, []);

  const onTabDelete = useCallback(
    (fileId) => {
      deleteTabList(fileId, tabList);
    },
    [tabList]
  );

  const onTabSelect = useCallback(
    async (fileId: string) => {
      const _tabIndex = tabList.findIndex((tab) => tab.id === fileId);
      setTabIndex(_tabIndex);

      setTabIndexToLocal(_tabIndex);

      console.log('--- onTabSelect ---', fileId, _tabIndex);

      const file = await menuIndexeddbStorage.getFile(fileId);
      setCurrentFile(file);
    },
    [tabList]
  );

  const onAction = useCallback((action: Action) => {
    console.log('--- onAction ---', action);

    switch (action.type) {
      case 'FlexLayout_DeleteTab':
        onTabDelete(action.data.node);
        break;
      case 'FlexLayout_SelectTab':
        onTabSelect(action.data.tabNode);
        break;
    }
    return undefined;
  }, []);

  return model ? <Layout model={model} factory={factory} onAction={onAction} /> : null;
}
