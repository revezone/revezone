import { ReactNode, useCallback } from 'react';
import { Layout, Dropdown } from 'antd';
import {
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Smartphone,
  ArrowUpRightFromCircle,
  Github,
  Twitter,
  Coffee,
  Cat
} from 'lucide-react';
import CustomMenu from '../CustomMenu';
import { siderbarCollapsedAtom, themeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
// import LanguageSwitcher from '../LanguageSwitcher';
// import ThemeSwitcher from '../ThemeSwitcher';

import './index.css';
import { useTranslation } from 'react-i18next';

const { Content, Sider } = Layout;

type Props = {
  children: ReactNode;
};

const RevenoteLayout = ({ children }: Props): JSX.Element => {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme] = useAtom(themeAtom);
  const { t } = useTranslation();

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);
  }, [collapsed]);

  const helpMenu = [
    {
      key: 'issue',
      title: t('help.issue'),
      icon: <ArrowUpRightFromCircle className="w-4" />,
      label: (
        <a href="https://github.com/revenote/revenote/issues/new" target="_blank" rel="noreferrer">
          {t('help.issue')}
        </a>
      )
    },
    {
      key: 'contactTheAuthor',
      title: t('help.contactTheAuthor'),
      icon: <Smartphone className="w-4" />,
      label: (
        <a href="https://korbinzhao.deno.dev" target="_blank" rel="noreferrer">
          {t('help.contactTheAuthor')}
        </a>
      )
    },
    {
      key: 'github',
      title: t('links.github'),
      icon: <Github className="w-4" />,
      label: (
        <a href="https://github.com/revenote/revenote" target="_blank" rel="noreferrer">
          {t('links.github')}
        </a>
      )
    },
    {
      key: 'twitter',
      title: t('links.twitter'),
      icon: <Twitter className="w-4" />,
      label: (
        <a href="https://twitter.com/therevenote" target="_blank" rel="noreferrer">
          {t('links.twitter')}
        </a>
      )
    },
    {
      key: 'authorTwitter',
      title: t('links.authorTwitter'),
      icon: <Twitter className="w-4" />,
      label: (
        <a href="https://twitter.com/korbinzhao" target="_blank" rel="noreferrer">
          {t('links.authorTwitter')}
        </a>
      )
    },
    {
      key: 'buymeacoffee',
      title: t('links.buyMeACoffee'),
      icon: <Coffee className="w-4" />,
      label: (
        <a href="https://www.buymeacoffee.com/korbinzhao" target="_blank" rel="noreferrer">
          {t('links.buyMeACoffee')}
        </a>
      )
    },
    {
      key: 'feedmycat',
      title: t('links.feedMyCat'),
      icon: <Cat className="w-4" />,
      label: (
        <a href="https://afdian.net/a/wantian" target="_blank" rel="noreferrer">
          {t('links.feedMyCat')}
        </a>
      )
    }
  ];

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
          <div className="bottom-toolbar absolute bottom-0 right-0">
            <Dropdown menu={{ items: helpMenu }}>
              <HelpCircle className="w-4 cursor-pointer mr-5 mb-1"></HelpCircle>
            </Dropdown>
          </div>
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
