import { ReactNode, useCallback, useState } from 'react';
import { Layout } from 'antd';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SiderTheme } from 'antd/es/layout/Sider';
import CustomMenu from '../CustomMenu';
import { siderbarCollapsedAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme, setTheme] = useState<SiderTheme>('light');

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

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
              <PanelLeftClose
                className="w-5 text-current cursor-pointer"
                onClick={switchCollapse}
              />
            </span>
          </div>
          <CustomMenu collapsed={collapsed} />
        </Sider>
        <Layout>
          <Content className="font-sans">
            {collapsed && (
              <PanelLeftOpen
                onClick={switchCollapse}
                className="w-5 text-current cursor-pointer mt-3 ml-3 absolute z-50"
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
