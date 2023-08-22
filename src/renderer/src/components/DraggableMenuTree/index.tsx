import { ControlledTreeEnvironment, Tree } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Menu, Dropdown, Input } from 'antd';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import type { RevezoneFile, RevezoneFolder, OnFolderOrFileAddProps } from '@renderer/types/file';
import { setOpenKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { currentFolderIdAtom, openKeysAtom, selectedKeysAtom } from '@renderer/store/jotai';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import OperationBar from '../OperationBar';
import RevezoneLogo from '../RevezoneLogo';

import './index.css';

import {
  Folder,
  HardDrive,
  UploadCloud,
  MoreVertical,
  FolderPlus,
  Palette,
  FileType
} from 'lucide-react';
import useFileTreeContextMenu from '@renderer/hooks/useFileTreeContextMenu';
import useFileTree from '@renderer/hooks/useFileTree';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher/index';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { submitUserEvent } from '@renderer/utils/statistics';
import PublicBetaNotice from '@renderer/components/PublicBetaNotice';
import useTabList from '@renderer/hooks/useTabList';
import useCurrentFile from '@renderer/hooks/useCurrentFile';

interface Props {
  collapsed: boolean;
}

export default function DraggableMenuTree() {
  const [openKeys, setOpenKeys] = useAtom(openKeysAtom);
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [focusItem, setFocusItem] = useState();
  const [currentFolderId, setCurrentFolderId] = useAtom(currentFolderIdAtom);
  const [editableTextState, setEditableTextState] = useState<{ [key: string]: boolean }>({});
  const firstRenderRef = useRef(false);
  const { fileTree, getFileTree } = useFileTree();
  const { t } = useTranslation();

  const { updateTabList, tabList } = useTabList();
  const { currentFile, updateCurrentFile, setCurrentFile } = useCurrentFile();

  // const onFolderOrFileAdd = useCallback(
  //   ({ fileId, folderId, type }: OnFolderOrFileAddProps) => {
  //     setOpenKeys([...openKeys, folderId]);
  //     // updateEditableTextState(fileId || folderId, false, editableTextState);
  //     if (type === 'file') {
  //       // addSelectedKeys(fileId ? [fileId] : []);
  //     } else if (type === 'folder') {
  //       resetMenu();
  //       updateCurrentFile(undefined);
  //       // setSelectedKeys([folderId]);
  //     }
  //   },
  //   [openKeys, editableTextState]
  // );

  // const [addFile] = useAddFile({ onAdd: onFolderOrFileAdd });

  // const [pageTitle] = useBlocksuitePageTitle({ getFileTree });

  // useEffect(() => {
  //   !collapsed && getFileTree();
  // }, [menuIndexeddbStorage, collapsed]);

  useEffect(() => {
    getFileTree();
  }, []);

  // useEffect(() => {
  //   if (firstRenderRef.current === true || !fileTree?.length) return;
  //   firstRenderRef.current = true;

  //   // const currentFileIdFromLocal = getCurrentFileIdFromLocal();
  //   // const file = currentFileIdFromLocal ? getFileById(currentFileIdFromLocal, fileTree) : undefined;

  //   // setCurrentFile(file);
  // }, [fileTree]);

  // useEffect(() => {
  //   if (firstRenderRef.current === false) return;
  //   setCurrentFileIdToLocal(currentFile?.id);
  //   setSelectedKeys(currentFile?.id ? [currentFile.id] : []);
  // }, [currentFile?.id]);

  //   useEffect(() => {
  //     if (!currentFile) {
  //       return;
  //     }
  //     const folderId = getFolderIdByFileId(currentFile.id, fileTree);
  //     setCurrentFolderId(folderId);
  //   }, [currentFile, fileTree]);

  // const addSelectedKeys = useCallback(
  //   (keys: string[] | undefined) => {
  //     if (!keys) return;

  //     let newKeys = selectedKeys;

  //     keys.forEach((key: string) => {
  //       const type = key?.startsWith('folder_') ? 'folder' : 'file';

  //       newKeys = type ? newKeys.filter((_key) => !_key?.startsWith(type)) : newKeys;
  //     });

  //     newKeys = Array.from(new Set([...newKeys, ...keys])).filter((_key) => !!_key);

  //     setSelectedKeys(newKeys);
  //   },
  //   [selectedKeys]
  // );

  const deleteFile = useCallback(
    async (file: RevezoneFile) => {
      await fileTreeIndexeddbStorage.deleteFile(file.id);

      console.log('--- delete file ---', file);

      switch (file.type) {
        case 'board':
          await boardIndexeddbStorage.deleteBoard(file.id);
          break;
        case 'note':
          await blocksuiteStorage.deletePage(file.id);
          break;
      }

      if (file.id === currentFile?.id) {
        updateCurrentFile(undefined);
      }

      await getFileTree();
    },
    [fileTreeIndexeddbStorage, currentFile]
  );

  const deleteFolder = useCallback(
    async (folder: RevezoneFolder) => {
      await fileTreeIndexeddbStorage.deleteFolder(folder.id);
      await getFileTree();
    },
    [fileTreeIndexeddbStorage]
  );

  const { getFileTreeContextMenu } = useFileTreeContextMenu({
    deleteFile,
    deleteFolder
  });

  const resetMenu = useCallback(() => {
    updateCurrentFile(undefined);
    // setCurrentFolderId(undefined);
    setSelectedKeys([]);
  }, []);

  const onExpandItem = useCallback((item) => {
    console.log('--- onExpandItem ---', item);
    const keys = [...openKeys, item.id];
    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  const onCollapseItem = useCallback((item) => {
    const keys = openKeys.filter((key) => key !== item.id);
    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  const onSelectItems = useCallback(
    async (items) => {
      const key = typeof items?.[0] === 'string' ? items?.[0] : items?.[0].id;

      console.log('onSelect', items);

      const fileId = key?.startsWith('file_') ? key : undefined;

      if (!fileId) return;

      //   const folderId = getFolderIdByFileId(fileId, fileTree);

      //   resetMenu();

      const file = await updateCurrentFile(fileId);
      //   setCurrentFolderId(folderId);
      //   addSelectedKeys([key, folderId]);

      updateTabList(file, tabList);

      submitUserEvent('select_menu', { key });
    },
    [fileTree, tabList]
  );

  const onFocusItem = useCallback((item) => {
    setFocusItem(item.id);
  }, []);

  const storageTypeItems = [
    {
      key: 'local',
      icon: <HardDrive className="w-4 mr-1"></HardDrive>,
      label: t('storage.local')
    },
    {
      key: 'cloud',
      icon: <UploadCloud className="w-4 mr-1"></UploadCloud>,
      disabled: true,
      label: t('storage.cloud')
    }
  ];

  return (
    <div className="revezone-menu-container">
      <div className="flex flex-col mb-1 pl-5 pr-8 pt-0 justify-between">
        <div className="flex items-center">
          <RevezoneLogo size="small" onClick={() => resetMenu()} />
          <span>&nbsp;-&nbsp;{t('text.alpha')}</span>
          <PublicBetaNotice />
        </div>
        <div className="flex justify-start">
          <div className="mr-2 whitespace-nowrap">
            <Dropdown menu={{ items: storageTypeItems }}>
              <span className="text-slate-500 flex items-center cursor-pointer text-sm">
                <HardDrive className="w-4 mr-1"></HardDrive>
                {t('storage.local')}
              </span>
            </Dropdown>
          </div>
          <LanguageSwitcher></LanguageSwitcher>
        </div>
      </div>
      <OperationBar size="small" />
      <div className="menu-list border-t border-slate-100 pl-2 pr-4">
        <ControlledTreeEnvironment
          items={fileTree}
          getItemTitle={(item) => `${item.data.name}`}
          viewState={{
            ['revezone-file-tree']: {
              selectedItems: selectedKeys,
              expandedItems: openKeys,
              focusedItem: focusItem
            }
          }}
          canDragAndDrop={true}
          canDropOnFolder={true}
          canReorderItems={true}
          canRename={true}
          canSearch={true}
          onSelectItems={onSelectItems}
          onExpandItem={onExpandItem}
          onCollapseItem={onCollapseItem}
          onFocusItem={onFocusItem}
          onRenameItem={async (item, name) => {
            fileTreeIndexeddbStorage.updateFileName(item.data, name);
            getFileTree();
          }}
          renderTreeContainer={({ children, containerProps }) => (
            <div {...containerProps}>{children}</div>
          )}
          renderItemsContainer={({ children, containerProps }) => (
            <ul {...containerProps}>{children}</ul>
          )}
          renderItem={({ item, depth, children, title, context, arrow }) => {
            const InteractiveComponent = context.isRenaming ? 'div' : 'button';
            const type = context.isRenaming ? undefined : 'button';

            return (
              <li {...context.itemContainerWithChildrenProps} className="rct-tree-item-li">
                <div
                  {...context.itemContainerWithoutChildrenProps}
                  style={{ paddingLeft: `${(depth + 1) * 0.5}rem` }}
                  className={[
                    'rct-tree-item-title-container',
                    item.isFolder && 'rct-tree-item-title-container-isFolder',
                    context.isSelected && 'rct-tree-item-title-container-selected',
                    context.isExpanded && 'rct-tree-item-title-container-expanded',
                    context.isFocused && 'rct-tree-item-title-container-focused',
                    context.isDraggingOver && 'rct-tree-item-title-container-dragging-over',
                    context.isSearchMatching && 'rct-tree-item-title-container-search-match'
                  ].join(' ')}
                >
                  {arrow}
                  <InteractiveComponent
                    // @ts-ignore
                    type={type}
                    {...context.interactiveElementProps}
                    className="rct-tree-item-button flex justify-between"
                  >
                    <span>{title}</span>
                    <div>
                      <Dropdown
                        menu={{
                          items: getFileTreeContextMenu(item.data, context, !!item.isFolder)
                        }}
                      >
                        <MoreVertical className="w-3 h-3 mr-2 cursor-pointer text-gray-500" />
                      </Dropdown>

                      {item.isFolder ? <Folder className="w-4 h-4" /> : null}
                      {item.data.type === 'note' ? <FileType className="w-4 h-4" /> : null}
                      {item.data.type === 'board' ? <Palette className="w-4 h-4" /> : null}
                    </div>
                  </InteractiveComponent>
                </div>
                {children}
              </li>
            );
          }}
        >
          <Tree treeId="revezone-file-tree" rootItem="root" treeLabel="FileTree" />
        </ControlledTreeEnvironment>
      </div>
    </div>
  );
}
