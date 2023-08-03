import { ReactNode, useCallback } from 'react';
import { Layout, Dropdown } from 'antd';
import { PanelLeftClose, PanelLeftOpen, Settings, Languages, Sun, MoonStar } from 'lucide-react';
import CustomMenu from '../CustomMenu';
import { siderbarCollapsedAtom, themeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
// import LanguageSwitcher from '../LanguageSwitcher';
// import ThemeSwitcher from '../ThemeSwitcher';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme] = useAtom(themeAtom);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

  // const settingsMenu = [
  //   {
  //     key: 'language',
  //     title: 'language',
  //     icon: <Languages className="w-4" />,
  //     label: <LanguageSwitcher />
  //   }
  //   // {
  //   //   key: 'theme',
  //   //   title: 'theme',
  //   //   icon: <Sun className="w-4" />,
  //   //   label: <ThemeSwitcher />
  //   // }
  // ];

  return (
    <div className={`revenote-layout ${collapsed ? 'sidebar-collapsed' : null}`}>
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
          <div className="revenote-topleft-toolbar">
            <PanelLeftClose
              className="panel-left-button w-5 text-current cursor-pointer"
              onClick={switchCollapse}
            />
          </div>
          <CustomMenu collapsed={collapsed} />
          {/* <div className="bottom-toolbar absolute bottom-0 right-0">
            <Dropdown menu={{ items: settingsMenu }}>
              <Settings className="w-5 cursor-pointer mr-5 mb-1"></Settings>
            </Dropdown>
          </div> */}
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
