import { Layout, Model, Action, Actions, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import NoteEditor from '@renderer/components/NoteEditor';
import RevedrawApp from '../RevedrawApp';
import WelcomePage from '../WelcomePage';
import { useCallback, useEffect, useRef, useState } from 'react';
import useTabJsonModel, { getActiveTabset } from '@renderer/hooks/useTabJsonModel';
import { useAtom } from 'jotai';
import { setTabJsonModelToLocal } from '@renderer/store/localstorage';
import useCurrentFile from '@renderer/hooks/useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { siderbarCollapsedAtom, tabModelAtom } from '@renderer/store/jotai';
import { RevezoneFile, RevezoneFileType } from '@renderer/types/file';
import { FileText, PenLine } from 'lucide-react';
import ReveTldraw from '../Tldraw';
import { TldrawIcon } from '@renderer/icons';
import './index.css';

export default function MultiTabs() {
  const { tabJsonModel, deleteTab, getTabList } = useTabJsonModel();
  const [model, setModel] = useAtom(tabModelAtom);
  const [hasDocuments, setHasDocuments] = useState(false);
  const { currentFile, updateCurrentFile } = useCurrentFile();
  const focusedFile = useRef(currentFile?.id);
  const updateFocus = useRef(updateCurrentFile);
  focusedFile.current = currentFile?.id;
  updateFocus.current = updateCurrentFile;
  const [collapsed] = useAtom(siderbarCollapsedAtom);

  useEffect(() => {
    const nextModel = Model.fromJson(tabJsonModel);
    // Old layouts stored the welcome page as a tab. It is now the empty state.
    const welcomeTabs = getTabList(tabJsonModel.layout).filter(
      (tab) => tab.config?.type === 'welcome'
    );
    for (const tab of welcomeTabs) {
      if (tab.id) nextModel.doAction(Actions.deleteTab(tab.id));
    }

    const savedLayout = nextModel.toJson();
    const hasTabs = getTabList(savedLayout.layout).length > 0;
    if (welcomeTabs.length) setTabJsonModelToLocal(JSON.stringify(savedLayout));

    setHasDocuments(hasTabs);
    setModel(nextModel);

    const selected = getActiveTabset(nextModel)?.getSelectedNode();
    const selectedId = selected?.getId();
    if (selectedId === focusedFile.current) return;

    let active = true;
    const previousId = focusedFile.current;
    if (selectedId) {
      void fileTreeIndexeddbStorage.getFile(selectedId).then((file) => {
        if (active && focusedFile.current === previousId) void updateFocus.current(file);
      });
    } else {
      void updateFocus.current(undefined);
    }
    return () => {
      active = false;
    };
  }, [getTabList, setModel, tabJsonModel]);

  const factory = useCallback((node: TabNode) => {
    const file = { ...(node.getConfig() as RevezoneFile), name: node.getName() };
    let content: JSX.Element | null = null;

    switch (file.type) {
      case 'note':
        content = <NoteEditor file={file} />;
        break;
      case 'board':
        content = <RevedrawApp file={file} />;
        break;
      case 'tldraw':
        content = <ReveTldraw file={file} />;
        break;
    }

    return (
      <div
        className="tab_content rz-document-enter"
        onPointerDownCapture={() => {
          if (file.id && focusedFile.current !== file.id) {
            focusedFile.current = file.id;
            void updateFocus.current(file);
          }
        }}
      >
        {content}
      </div>
    );
  }, []);

  const onAction = useCallback(
    (action: Action) => {
      if (!model) return action;

      if (action.type === Actions.DELETE_TAB) {
        void deleteTab(action.data.node, model);
        return undefined;
      }

      if (action.type === Actions.SELECT_TAB) {
        const fileId: string = action.data.tabNode;
        focusedFile.current = fileId;
        void fileTreeIndexeddbStorage.getFile(fileId).then((file) => {
          if (focusedFile.current === fileId) void updateFocus.current(file);
        });
      }

      return action;
    },
    [deleteTab, model]
  );

  const iconFactory = useCallback((tabNode: TabNode) => {
    const fileType: RevezoneFileType = tabNode.getConfig()?.type;

    switch (fileType) {
      case 'note':
        return <FileText size={14} aria-hidden="true" />;
      case 'board':
        return <PenLine size={14} aria-hidden="true" />;
      case 'tldraw':
        return <TldrawIcon className="w-3 h-3" />;
      default:
        return null;
    }
  }, []);

  const onModelChange = useCallback(
    (updated: Model) => {
      const savedLayout = updated.toJson();
      setTabJsonModelToLocal(JSON.stringify(savedLayout));
      setHasDocuments(getTabList(savedLayout.layout).length > 0);
    },
    [getTabList]
  );

  return (
    <div className={`revezone-layout-wrapper ${collapsed ? 'rz-files-collapsed' : ''}`}>
      {model && hasDocuments ? (
        <Layout
          model={model}
          factory={factory}
          onAction={onAction}
          iconFactory={iconFactory}
          onModelChange={onModelChange}
        />
      ) : (
        <>
          <div className="rz-empty-tabstrip" aria-hidden="true" />
          <WelcomePage />
        </>
      )}
    </div>
  );
}
