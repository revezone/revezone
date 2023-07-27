import { ReactNode, useCallback, useState } from 'react';
import { Layout, message } from 'antd';
import {
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  FolderPlusIcon
} from '@heroicons/react/24/outline';
import { SiderTheme } from 'antd/es/layout/Sider';
import CustomMenu from '../CustomMenu';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { fileTreeAtom, siderbarCollapsedAtom, currentFolderIdAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import AddFile from '../AddFile/index';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme, setTheme] = useState<SiderTheme>('light');
  const [, setFileTree] = useAtom(fileTreeAtom);
  const [currentFolderId] = useAtom(currentFolderIdAtom);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

  const addFolder = useCallback(async () => {
    await menuIndexeddbStorage.addFolder();
    const tree = await menuIndexeddbStorage.getFileTree();
    setFileTree(tree);
  }, []);

  return (
    <div className={`revenote-layout ${collapsed ? 'sidebar-collapsed' : null}`}>
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
              <AddFile size="middle" folderId={currentFolderId} />
              <FolderPlusIcon
                className="h-5 w-5 text-current cursor-pointer mr-5"
                onClick={addFolder}
              />
              <ArrowLeftOnRectangleIcon
                className="h-5 w-5 text-current cursor-pointer"
                onClick={switchCollapse}
              />
            </span>
          </div>
          <CustomMenu collapsed={collapsed} />
        </Sider>
        <Layout>
          <Content className="font-sans">
            {collapsed && (
              <ArrowRightOnRectangleIcon
                onClick={switchCollapse}
                className="h-5 w-5 text-current cursor-pointer mt-3 ml-3 absolute z-50"
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
