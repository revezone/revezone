import { Menu } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { FolderIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { indexeddbStorage, RevenoteFolder, RevenoteFile } from '@renderer/store/indexeddb';

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

    getFilesInFolder(currentFolder);
  }, [indexeddbStorage]);

  const getFilesInFolder = useCallback(async (currentFolder) => {
    if (!currentFolder) {
      return;
    }

    const filesInFolder = currentFolder?.id
      ? await indexeddbStorage.getFilesInFolder(currentFolder.id)
      : undefined;

    const currentFile = filesInFolder?.[0];

    if (!currentFile) {
      return;
    }

    setSelectedKeys([currentFile.id]);

    setFilesInFolder(filesInFolder);
  }, []);

  useEffect(() => {
    getFolders();
  }, [indexeddbStorage]);

  return (
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
            <DocumentPlusIcon className="h-4 w-4 text-current cursor-pointer" />
          </div>
        ),
        children: filesInFolder?.map((file) => {
          return {
            key: file.id,
            label: file.name
          };
        })
      }))}
    />
  );
}
