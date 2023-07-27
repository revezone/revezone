import { useCallback, useEffect, useState } from 'react';
import { Menu, Dropdown } from 'antd';
import { FolderIcon, TrashIcon } from '@heroicons/react/24/outline';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import type { RevenoteFile, RevenoteFolder } from '@renderer/types/file';
import {
  getOpenKeysFromLocal,
  getSelectedKeysFromLocal,
  setCurrentFileIdToLocal,
  setOpenKeysToLocal,
  setSelectedKeysToLocal
} from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import {
  currentFileIdAtom,
  currentFileAtom,
  fileTreeAtom,
  currentFolderIdAtom
} from '@renderer/store/jotai';
import EditableText from '../EditableText';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import useBlocksuitePageTitle from '@renderer/hooks/useBlocksuitePageTitle';
import { useDebounceEffect } from 'ahooks';
import { FILE_ID_REGEX } from '@renderer/utils/constant';
import AddFile from '../AddFile';

import './index.css';
import { getCurrentFolderId } from '@renderer/utils/menu';

interface Props {
  collapsed: boolean;
}

const getFileMenuKey = (id, name) => `${id}______${name}`;

export default function CustomMenu({ collapsed }: Props) {
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeysFromLocal());
  const [selectedKeys, setSelectedKeys] = useState<string[]>(getSelectedKeysFromLocal());
  const [currentFileId, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [pageTitle] = useBlocksuitePageTitle();
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);
  const [currentFolderId, setCurrentFolderId] = useAtom(currentFolderIdAtom);

  const getFileTree = useCallback(async () => {
    const tree = await menuIndexeddbStorage.getFileTree();
    setFileTree(tree);
    return tree;
  }, []);

  useEffect(() => {
    !collapsed && getFileTree();
  }, [menuIndexeddbStorage, collapsed]);

  useEffect(() => {
    setSelectedKeysToLocal(selectedKeys);
  }, [selectedKeys]);

  useEffect(() => {
    const files = fileTree.reduce(
      (prev, item) => [...prev, ...item.children],
      [] as RevenoteFile[]
    );
    const file =
      (currentFileId && files?.find((_file) => _file.id === currentFileId)) || files?.[0];

    setCurrentFile(file);
    file && setSelectedKeys([getFileMenuKey(file.id, file.name)]);
  }, [currentFileId, fileTree]);

  useEffect(() => {
    if (currentFileId) {
      setCurrentFileIdToLocal(currentFileId);
    }
  }, [currentFileId]);

  useEffect(() => {
    if (!currentFileId) return;
    const folderId = getCurrentFolderId(currentFileId, fileTree);
    setCurrentFolderId(folderId);
  }, [currentFileId, fileTree]);

  const refreshMenu = useCallback(async () => {
    await getFileTree();
  }, [pageTitle]);

  useDebounceEffect(
    () => {
      refreshMenu();
    },
    [pageTitle],
    {
      wait: 200
    }
  );

  const onAddFile = useCallback((fileId: string, folderId: string) => {
    setOpenKeys([...openKeys, folderId]);
  }, []);

  const deleteFile = useCallback(
    async (fileId: string, folderId: string) => {
      await menuIndexeddbStorage.deleteFile(fileId);
      await blocksuiteStorage.deletePage(fileId);

      const tree = await getFileTree();

      console.log('currentFileId', currentFileId, fileId);

      // reset current file when current file is removed
      if (currentFileId === fileId) {
        const filesInFolder = tree.find((folder) => folder.id === folderId)?.children;

        setCurrentFileId(filesInFolder?.[0]?.id);
      }
    },
    [menuIndexeddbStorage]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      await menuIndexeddbStorage.deleteFolder(folderId);
      await getFileTree();
    },
    [menuIndexeddbStorage]
  );

  const onOpenChange = useCallback((keys) => {
    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  const onSelect = useCallback(({ key }) => {
    const fileId = key?.match(FILE_ID_REGEX)?.[1];
    setCurrentFileId(fileId);
  }, []);

  const getFolderMenu = useCallback(
    (folder: RevenoteFolder) => [
      {
        key: 'rename',
        label: 'rename',
        onClick: () => {
          console.log('rename');
        }
      },
      {
        key: 'delete',
        label: 'delete',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          deleteFolder(folder.id);
        }
      }
    ],
    []
  );

  const getFileMenu = useCallback(
    (file, folder) => [
      {
        key: 'rename',
        label: 'rename',
        onClick: () => {
          console.log('rename');
        }
      },
      {
        key: 'delete',
        label: (
          <div className="flex items-center justify-between">
            <TrashIcon className="h-4 w-4" />
            <span className="ml-2">Delete</span>
          </div>
        ),
        onClick: () => {
          console.log('delete');
          deleteFile(file.id, folder.id);
        }
      },
      {
        key: 'copy_revenote_link',
        label: 'Copy Revenote Link',
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          navigator.clipboard.writeText(file.id);
        }
      }
    ],
    []
  );

  const onFileNameChange = useCallback((text: string, file: RevenoteFile) => {
    if (file.type === 'note') {
      blocksuiteStorage.updatePageTitle(file.id, text);
    }

    console.log('onFileNameChange', text);

    menuIndexeddbStorage.updateFileName(file, text);
  }, []);

  const onFolderNameChange = useCallback((folder: RevenoteFolder, text: string) => {
    menuIndexeddbStorage.updateFolderName(folder, text);
  }, []);

  return (
    <div className="revenote-menu-container">
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        style={{ border: 'none' }}
        items={fileTree?.map((folder) => ({
          key: folder.id,
          icon: <FolderIcon className="h-4 w-4" />,
          label: (
            <Dropdown menu={{ items: getFolderMenu(folder) }} trigger={['contextMenu']}>
              <div className="flex items-center justify-between">
                <EditableText
                  text={folder.name}
                  defaultText="Untitled"
                  onChange={(text) => onFolderNameChange(folder, text)}
                />
                <AddFile size="small" folderId={currentFolderId} onAdd={onAddFile} />
              </div>
            </Dropdown>
          ),
          children: folder?.children?.map((file) => {
            return {
              key: getFileMenuKey(file.id, file.name),
              label: (
                <Dropdown menu={{ items: getFileMenu(file, folder) }} trigger={['contextMenu']}>
                  <div className="flex items-center justify-between">
                    <EditableText
                      type={file.type}
                      text={file.name}
                      defaultText="Untitled"
                      onChange={(text) => onFileNameChange(text, file)}
                    />
                  </div>
                </Dropdown>
              )
            };
          })
        }))}
      />
    </div>
  );
}
