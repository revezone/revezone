import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  FolderIcon,
  FolderPlusIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { SiderTheme } from 'antd/es/layout/Sider';
import { indexeddbStorage, RevenoteFolder, RevenoteFile } from '@renderer/store/indexeddb';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<SiderTheme>('light');
  const [folderList, setFolderList] = useState<RevenoteFolder[] | undefined>([]);
  const [currentFolder, setCurrentFolder] = useState<RevenoteFolder>();
  const [filesInFolder, setFilesInFolder] = useState<RevenoteFile[]>();
  const [currentFile, setCurrentFile] = useState<RevenoteFile>();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api.toggleTrafficLight(collapsed);
  }, [collapsed]);

  const getFolders = useCallback(async () => {
    const folders = await indexeddbStorage.getFolders();
    setFolderList(folders);

    const currentFolder = folders?.[0];

    if (!currentFolder) {
      return;
    }

    setCurrentFolder(currentFolder);

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

    setCurrentFile(currentFile);

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
    <div className="revenote-layout">
      <Layout>
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          theme={theme}
          trigger={null}
          collapsed={collapsed}
          width={260}
          onBreakpoint={(broken): void => {
            console.log(broken);
          }}
          onCollapse={(collapsed, type): void => {
            console.log(collapsed, type);
          }}
        >
          <div className="revenote-topleft-toolbar">
            <span className="tool-buttons">
              <FolderPlusIcon className="h-5 w-5 text-current cursor-pointer mr-5" />
              <ArrowLeftOnRectangleIcon
                className="h-5 w-5 text-current cursor-pointer"
                onClick={switchCollapse}
              />
            </span>
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys)}
            onSelect={({ key }) => setSelectedKeys([key])}
            style={{ border: 'none' }}
            items={folderList?.map((folder, index) => ({
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
        </Sider>
        <Layout>
          <Content className="font-sans">
            {collapsed && (
              <ArrowRightOnRectangleIcon
                onClick={switchCollapse}
                className="h-5 w-5 text-current cursor-pointer mt-3 ml-5 absolute z-50"
              />
            )}
            {children}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default RevenoteLayout;
