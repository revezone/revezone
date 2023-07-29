import { useCallback, useEffect, useState } from 'react';
import { Menu, Dropdown } from 'antd';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import type { RevenoteFile, RevenoteFolder, OnFolderOrFileAddProps } from '@renderer/types/file';
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
import OperationBar from '../OperationBar';
import moment from 'moment';
import RevenoteLogo from '../RevenoteLogo';

import './index.css';
import { getCurrentFolderIdByFileId, getFileMenuKey } from '@renderer/utils/menu';
import { Copy, FileEdit, FolderEdit, Trash2, Folder } from 'lucide-react';

interface Props {
  collapsed: boolean;
}

export default function CustomMenu({ collapsed }: Props) {
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeysFromLocal());
  const [selectedKeys, setSelectedKeys] = useState<string[]>(getSelectedKeysFromLocal());
  const [currentFileId, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [pageTitle] = useBlocksuitePageTitle();
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);
  const [currentFolderId, setCurrentFolderId] = useAtom(currentFolderIdAtom);
  const [editableTextState, setEditableTextState] = useState<{ [key: string]: boolean }>({});

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
      (prev: RevenoteFile[], current) => [...prev, ...current.children],
      []
    );

    const file = currentFileId ? files?.find((_file) => _file.id === currentFileId) : null;

    console.log('--- file ---', currentFileId, file);

    setCurrentFile(file);
  }, [currentFileId, fileTree]);

  useEffect(() => {
    setCurrentFileIdToLocal(currentFileId);
  }, [currentFileId]);

  useEffect(() => {
    if (!currentFileId) {
      return;
    }
    const folderId = getCurrentFolderIdByFileId(currentFileId, fileTree);
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

  const addSelectedKeys = useCallback(
    (keys: string[] | undefined) => {
      if (!keys) return;

      let newKeys = selectedKeys;

      keys.forEach((key: string) => {
        const type = key?.startsWith('folder_') ? 'folder' : 'file';

        newKeys = type ? newKeys.filter((_key) => !_key?.startsWith(type)) : newKeys;
      });

      newKeys = Array.from(new Set([...newKeys, ...keys])).filter((_key) => !!_key);

      setSelectedKeys(newKeys);
    },
    [selectedKeys]
  );

  const onFolderOrFileAdd = useCallback(
    ({ fileId, folderId, type }: OnFolderOrFileAddProps) => {
      setOpenKeys([...openKeys, folderId]);
      updateEditableTextState(fileId || folderId, false, editableTextState);
      if (type === 'file') {
        addSelectedKeys([getFileMenuKey(fileId, 'Untitled')]);
      } else if (type === 'folder') {
        resetMenu();
        setCurrentFileId(undefined);
        addSelectedKeys([folderId]);
      }
    },
    [openKeys, editableTextState]
  );

  const deleteFile = useCallback(
    async (fileId: string, folderId: string) => {
      await menuIndexeddbStorage.deleteFile(fileId);
      await blocksuiteStorage.deletePage(fileId);

      const tree = await getFileTree();

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

  const resetMenu = useCallback(() => {
    setCurrentFileId(undefined);
    setCurrentFolderId(undefined);
    setSelectedKeys([]);
  }, []);

  const onOpenChange = useCallback(
    (keys) => {
      const changeType = keys?.length > openKeys.length ? 'increase' : 'decrease';

      setOpenKeys(keys);
      setOpenKeysToLocal(keys);

      // only while openKeys increase
      if (changeType === 'increase') {
        const folderId = keys?.length ? keys[keys.length - 1] : undefined;

        if (currentFolderId !== folderId) {
          resetMenu();

          setCurrentFolderId(folderId);
          setSelectedKeys([folderId]);
        }
      }
    },
    [openKeys, currentFolderId]
  );

  const onSelect = useCallback(
    ({ key }) => {
      const fileId = key?.match(FILE_ID_REGEX)?.[1];

      console.log('onSelect', fileId, key);

      if (!fileId) return;

      const folderId = getCurrentFolderIdByFileId(fileId, fileTree);

      resetMenu();

      setCurrentFileId(fileId);
      setCurrentFolderId(folderId);
      addSelectedKeys([key, folderId]);
    },
    [fileTree]
  );

  const getFolderMenu = useCallback(
    (folder: RevenoteFolder) => [
      {
        key: 'rename',
        label: 'rename',
        icon: <FolderEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          updateEditableTextState(folder.id, false, editableTextState);
        }
      },
      {
        key: 'delete',
        label: 'delete',
        icon: <Trash2 className="w-4"></Trash2>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          deleteFolder(folder.id);
        }
      }
    ],
    [editableTextState]
  );

  const getFileMenu = useCallback(
    (file, folder) => [
      {
        key: 'rename',
        label: 'rename',
        icon: <FileEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          updateEditableTextState(file.id, false, editableTextState);
        }
      },
      {
        key: 'delete',
        label: 'delete',
        icon: <Trash2 className="w-4"></Trash2>,
        onClick: () => {
          console.log('delete');
          deleteFile(file.id, folder.id);
        }
      },
      {
        key: 'copy_revenote_link',
        label: 'Copy Revenote Link',
        icon: <Copy className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          navigator.clipboard.writeText(file.id);
        }
      }
    ],
    []
  );

  const updateEditableTextState = useCallback((id: string, value: boolean, editableTextState) => {
    const newEditableTextState = { ...editableTextState };
    newEditableTextState[id] = value;
    setEditableTextState(newEditableTextState);
  }, []);

  const onFileNameChange = useCallback(
    (text: string, file: RevenoteFile) => {
      if (file.type === 'note') {
        blocksuiteStorage.updatePageTitle(file.id, text);
      }
      menuIndexeddbStorage.updateFileName(file, text);
      updateEditableTextState(file.id, true, editableTextState);
      setSelectedKeys([getFileMenuKey(file.id, text)]);
    },
    [editableTextState]
  );

  const onFolderNameChange = useCallback(
    (folder: RevenoteFolder, text: string) => {
      menuIndexeddbStorage.updateFolderName(folder, text);
      updateEditableTextState(folder.id, true, editableTextState);
    },
    [editableTextState]
  );

  const onEditableTextEdit = useCallback(
    (id: string) => {
      updateEditableTextState(id, false, editableTextState);
    },
    [editableTextState]
  );

  return (
    <div className="revenote-menu-container">
      <div onClick={() => resetMenu()}>
        <RevenoteLogo size="small" className="pl-5" />
      </div>
      <OperationBar size="small" folderId={currentFolderId} onAdd={onFolderOrFileAdd} />
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
          icon: <Folder className="w-4" />,
          label: (
            <Dropdown menu={{ items: getFolderMenu(folder) }} trigger={['contextMenu']}>
              <div className="flex items-center justify-between">
                <EditableText
                  isPreview={editableTextState[folder.id]}
                  text={folder.name}
                  defaultText="Untitled"
                  onSave={(text) => onFolderNameChange(folder, text)}
                  onEdit={() => onEditableTextEdit(folder.id)}
                />
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
                      isPreview={editableTextState[file.id]}
                      type={file.type}
                      text={file.name}
                      extraText={moment(file.gmtModified).format('YYYY-MM-DD HH:mm:ss')}
                      defaultText="Untitled"
                      onSave={(text) => onFileNameChange(text, file)}
                      onEdit={() => onEditableTextEdit(file.id)}
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
