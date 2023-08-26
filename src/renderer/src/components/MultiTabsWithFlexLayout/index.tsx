import { IJsonModel, Layout, Model, Action, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import NoteEditor from '@renderer/components/NoteEditor';
import RevedrawApp from '../RevedrawApp';
import WelcomePage from '../WelcomePage';
import { useCallback, useEffect, useRef } from 'react';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';

import './index.css';
import { useAtom } from 'jotai';
import { setTabJsonModelToLocal } from '@renderer/store/localstorage';
import useCurrentFile from '@renderer/hooks/useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { siderbarCollapsedAtom, tabModelAtom } from '@renderer/store/jotai';
import { RevezoneFile, RevezoneFileType } from '@renderer/types/file';
import { Palette, FileType } from 'lucide-react';

export default function MultiTabs() {
  const { tabJsonModel, deleteTab } = useTabJsonModel();
  const [model, setModel] = useAtom(tabModelAtom);
  const { updateCurrentFile } = useCurrentFile();
  const [collapsed] = useAtom(siderbarCollapsedAtom);

  useEffect(() => {
    if (!tabJsonModel) return;

    console.log('--- tabJsonModel ---', tabJsonModel);

    const _model = Model.fromJson(tabJsonModel);

    setModel(_model);
  }, [tabJsonModel]);

  const renderContent = useCallback((file: RevezoneFile) => {
    // if (file?.id !== currentFile?.id) return;

    // console.log('--- renderContent ---', file);

    switch (file?.type) {
      case 'note':
        return <NoteEditor file={file} />;
      case 'board':
        return <RevedrawApp file={file} />;
      default:
        return <WelcomePage />;
    }
  }, []);

  const factory = useCallback((node: TabNode) => {
    const file = node.getConfig();

    return <div className="tab_content">{renderContent(file)}</div>;
  }, []);

  const onTabDelete = useCallback((fileId: string, model: Model | undefined) => {
    deleteTab(fileId, model);
  }, []);

  const onTabSelect = useCallback(async (fileId: string, model: Model | undefined) => {
    if (!model) return;

    const file = fileId ? await fileTreeIndexeddbStorage.getFile(fileId) : undefined;
    updateCurrentFile(file);
  }, []);

  const onAction = useCallback(
    (action: Action) => {
      console.log('--- onAction ---', action);

      if (!model) return;

      switch (action.type) {
        case 'FlexLayout_DeleteTab':
          onTabDelete(action.data.node, model);
          break;
        case 'FlexLayout_SelectTab':
          onTabSelect(action.data.tabNode, model);
          break;
      }

      return action;
    },
    [model]
  );

  const iconFactory = useCallback((tabNode: TabNode) => {
    const fileType: RevezoneFileType = tabNode.getConfig()?.type;

    switch (fileType) {
      case 'note':
        return <FileType className="w-4 h-4" />;
      case 'board':
        return <Palette className="w-4 h-4" />;
      default:
        return null;
    }
  }, []);

  const onModelChange = useCallback(() => {
    console.log('--- onModelChange ---');
    setTabJsonModelToLocal(JSON.stringify(model?.toJson()));
  }, [model]);

  return model ? (
    <div
      className={`revezone-layout-wrapper h-full ${collapsed ? 'revezone-siderbar-collapsed' : ''}`}
    >
      <Layout
        model={model}
        factory={factory}
        onAction={onAction}
        iconFactory={iconFactory}
        onModelChange={onModelChange}
      />
    </div>
  ) : null;
}
