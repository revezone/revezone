import { ReactNode, useCallback } from 'react';
import { Layout } from 'antd';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import CustomMenu from '../CustomMenu';
import { siderbarCollapsedAtom, themeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
// import LanguageSwitcher from '../LanguageSwitcher';
// import ThemeSwitcher from '../ThemeSwitcher';

import './index.css';
import { useTranslation } from 'react-i18next';
import BottomToolbar from '../BottomToolbar/index';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevezoneLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme] = useAtom(themeAtom);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

  return (
    <div className={`revezone-layout ${collapsed ? 'sidebar-collapsed' : null}`}>
      <Layout>
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          theme={theme}
          trigger={null}
          collapsed={collapsed}
          width={280}
          onBreakpoint={(broken): void => {
            console.log(broken);
          }}
          onCollapse={(collapsed, type): void => {
            console.log(collapsed, type);
          }}
        >
          <div className="revezone-topleft-toolbar">
            <PanelLeftClose
              className="panel-left-button w-5 text-current cursor-pointer"
              onClick={switchCollapse}
            />
          </div>
          <CustomMenu collapsed={collapsed} />
          <BottomToolbar />
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

export default RevezoneLayout;
