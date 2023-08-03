import { ReactNode, useCallback } from 'react';
import { Layout, Dropdown } from 'antd';
import {
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  ArrowUpRightFromCircle,
  DownloadCloud,
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
import { GithubCircle, Bilibili } from '@renderer/icons';

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
    },
    {
      key: 'authorBilibili',
      title: t('links.authorBilibili'),
      icon: <Bilibili className="w-4 h-4" />,
      label: (
        <a href="https://space.bilibili.com/393134139" target="_blank" rel="noreferrer">
          {t('links.authorBilibili')}
        </a>
      )
    },
    {
      key: 'downloadApp',
      title: t('links.downloadApp'),
      icon: <DownloadCloud className="w-4" />,
      label: (
        <a href="https://github.com/revenote/revenote/releases" target="_blank" rel="noreferrer">
          {t('links.downloadApp')}
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
          <div className="bottom-toolbar absolute h-8 pr-4 bottom-0 right-0 flex items-center text-slate-600">
            <a
              className="mr-2"
              href="https://afdian.net/a/wantian"
              target="_blank"
              rel="noreferrer"
              title="Feed my cat"
            >
              <Cat className="w-4 h-4"></Cat>
            </a>
            <a
              className="mr-2"
              href="https://www.buymeacoffee.com/korbinzhao"
              target="_blank"
              rel="noreferrer"
              title="Buy me a coffee"
            >
              <Coffee className="w-4 h-4"></Coffee>
            </a>
            <a
              className="mr-2"
              href="https://github.com/revenote/revenote"
              target="_blank"
              rel="noreferrer"
              title="Give a star"
            >
              <GithubCircle className="w-4 h-4"></GithubCircle>
            </a>
            <span title="Help">
              <Dropdown menu={{ items: helpMenu }}>
                <HelpCircle className="w-4 h-4 cursor-pointer"></HelpCircle>
              </Dropdown>
            </span>
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
