import { Menu } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { FolderIcon, DocumentPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { indexeddbStorage, RevenoteFolder, RevenoteFile } from '@renderer/store/indexeddb';

import './index.css';

export default function CustomMenu() {
  const [folderList, setFolderList] = useState<RevenoteFolder[] | undefined>([]);
  const [filesInFolder, setFilesInFolder] = useState<RevenoteFile[]>();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const getFolders = useCallback(async () => {
    const folders = await indexeddbStorage.getFolders();
    setFolderList(folders);

    const currentFolder = folders?.[0];

    if (!currentFolder) {
      return;
    }

    setOpenKeys([currentFolder.id]);

    getFilesInFolder(currentFolder.id);
  }, [indexeddbStorage]);

  const getFilesInFolder = useCallback(async (folderId: string) => {
    if (!folderId) {
      return;
    }

    const filesInFolder = await indexeddbStorage.getFilesInFolder(folderId);

    setFilesInFolder(filesInFolder);

    const currentFile = filesInFolder?.[0];

    if (!currentFile) {
      return;
    }

    setSelectedKeys([currentFile.id]);
  }, []);

  useEffect(() => {
    getFolders();
  }, [indexeddbStorage]);

  const addFile = useCallback(
    async (folderId: string) => {
      const file = await indexeddbStorage.addFile(folderId, 'markdown');
      setSelectedKeys([file.id]);
      await getFilesInFolder(folderId);
    },
    [indexeddbStorage]
  );

  const deleteFile = useCallback(
    async (fileId: string, folderId: string) => {
      await indexeddbStorage.deleteFile(fileId);
      await getFilesInFolder(folderId);
    },
    [indexeddbStorage]
  );

  // @ts-ignore
  window.filesInFolder = filesInFolder;

  return (
    <div className="revenote-menu-container">
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={(keys) => setOpenKeys(keys)}
        onSelect={({ key }) => setSelectedKeys([key])}
        style={{ border: 'none' }}
        items={folderList?.map((folder) => ({
          key: folder.id,
          icon: <FolderIcon className="h-4 w-4" />,
          label: (
            <div className="flex items-center justify-between">
              <span>{folder.name}</span>
              <DocumentPlusIcon
                className="h-4 w-4 text-current cursor-pointer mr-4 menu-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  addFile(folder.id);
                }}
              />
            </div>
          ),
          children: filesInFolder?.map((file) => {
            return {
              key: file.id,
              label: (
                <div className="flex items-center justify-between">
                  <span>{file.name}</span>
                  <TrashIcon
                    className="h-4 w-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id, folder.id);
                    }}
                  />
                </div>
              )
            };
          })
        }))}
      />
    </div>
  );
}
