import { ReactNode, useCallback, useState } from 'react';
import { Layout } from 'antd';
import {
  FolderPlusIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { SiderTheme } from 'antd/es/layout/Sider';
import CustomMenu from '../CustomMenu';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { folderListAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<SiderTheme>('light');
  const [folderList, setFolderList] = useAtom(folderListAtom);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

  const addFolder = useCallback(async () => {
    await menuIndexeddbStorage.addFolder();
    const folders = await menuIndexeddbStorage.getFolders();
    setFolderList(folders || []);
  }, []);

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
