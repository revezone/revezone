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
import { indexeddbStorage, RevenoteFolder, RevenoteFile } from '@renderer/store';

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

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api.toggleTrafficLight(collapsed);
  }, [collapsed]);

  // const folderList = indexeddbStorage.db.get('folder');

  console.log('--- indexeddbStorage ---', indexeddbStorage);

  const getFolders = useCallback(async () => {
    const folders = await indexeddbStorage.getFolders();
    folders?.[0] && setCurrentFolder(folders[0]);
    setFolderList(folders);
  }, [indexeddbStorage]);

  const getFilesInFolder = useCallback(async () => {
    if (currentFolder && indexeddbStorage) {
      const filesInFolder = await indexeddbStorage.getFilesInFolder(currentFolder?.id);

      setCurrentFile(filesInFolder?.[0]);

      setFilesInFolder(filesInFolder);
    }
  }, [indexeddbStorage, currentFolder]);

  useEffect(() => {
    getFolders();
    getFilesInFolder();
  }, [indexeddbStorage]);

  console.log('--- folderList ---', folderList);
  console.log('--- filesInFolder ---', filesInFolder);

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
            defaultSelectedKeys={[currentFile?.id || '']}
            defaultOpenKeys={[currentFolder?.id || '']}
            style={{ border: 'none' }}
            items={folderList?.map((folder, index) => ({
              key: String(index + 1),
              icon: <FolderIcon className="h-4 w-4" />,
              label: (
                <div className="flex items-center justify-between">
                  <span>{folder.name}</span>
                  <DocumentPlusIcon className="h-5 w-5 text-current cursor-pointer" />
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
