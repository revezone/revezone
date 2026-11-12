import { Layout, Model, Action, TabNode, IJsonTabSetNode } from 'flexlayout-react';
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
import { Palette, FileType, File } from 'lucide-react';
import { WELCOME_TAB_ITEM } from '@renderer/utils/constant';
// import MindMap from '../MindMap';
import ReveTldraw from '../Tldraw';
import { TldrawIcon } from '@renderer/icons';

export default function MultiTabs() {
  const { tabJsonModel, deleteTab, getTabList } = useTabJsonModel();
  const [model, setModel] = useAtom(tabModelAtom);
  const { currentFile, updateCurrentFile } = useCurrentFile();
  const focusedFile = useRef(currentFile?.id);
  const updateFocus = useRef(updateCurrentFile);
  focusedFile.current = currentFile?.id;
  updateFocus.current = updateCurrentFile;
  const [collapsed] = useAtom(siderbarCollapsedAtom);

  useEffect(() => {
    if (!tabJsonModel) return;

    try {
      const tabList = getTabList(tabJsonModel.layout);

      if (tabList.length === 0) {
        const tabset = tabJsonModel.layout.children[0] as IJsonTabSetNode;
        tabset.children.push(WELCOME_TAB_ITEM);
        tabset.selected = 0;
      }
    } catch (err) {
      console.warn(err);
    }

    const _model = Model.fromJson(tabJsonModel);

    setModel(_model);
  }, [tabJsonModel]);

  const renderContent = useCallback((file: RevezoneFile) => {
    switch (file?.type) {
      case 'note':
        return <NoteEditor file={file} />;
      case 'board':
        return <RevedrawApp file={file} />;
      case 'tldraw':
        return <ReveTldraw file={file} />;
      // case 'mindmap':
      //   return <MindMap />;
      default:
        return <WelcomePage />;
    }
  }, []);

  const factory = useCallback((node: TabNode) => {
    const file = node.getConfig() as RevezoneFile;
    return (
      <div
        className="tab_content"
        onPointerDownCapture={() => {
          if (file?.id && file.type !== 'welcome' && focusedFile.current !== file.id) {
            focusedFile.current = file.id;
            void updateFocus.current(file);
          }
        }}
      >
        {renderContent(file)}
      </div>
    );
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
      case 'tldraw':
        return <TldrawIcon className="w-3 h-3" />;
      case 'welcome':
        return <File className="w-4 h-4" />;
      default:
        return null;
    }
  }, []);

  const onModelChange = useCallback(() => {
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
