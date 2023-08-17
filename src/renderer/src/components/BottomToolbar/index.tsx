import {
  Cat,
  Coffee,
  HelpCircle,
  ArrowUpRightFromCircle,
  Twitter,
  DownloadCloud,
  Settings,
  PencilLine
} from 'lucide-react';
import { GithubCircle, Bilibili } from '@renderer/icons';
import { Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import DownloadApp from '../DownloadApp/index';
import { useAtom } from 'jotai';
import { langCodeAtom } from '@renderer/store/jotai';
import { submitUserEvent } from '@renderer/utils/statistics';
import SystemSettings from '../SystemSettings';

export default function BottomToolbar() {
  const { t } = useTranslation();
  const [langCode] = useAtom(langCodeAtom);
  const [systemSettingVisible, setSystemSettingVisible] = useState(false);

  const helpMenu = useMemo(
    () => [
      {
        key: 'issue',
        title: t('help.issue'),
        icon: <ArrowUpRightFromCircle className="w-4" />,
        label: (
          <a
            href="https://github.com/revezone/revezone/issues/new"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_issue', {});
            }}
          >
            {t('help.issue')}
          </a>
        )
      },
      {
        key: 'twitter',
        title: t('links.twitter'),
        icon: <Twitter className="w-4" />,
        label: (
          <a
            href="https://twitter.com/therevezone"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_twitter', {});
            }}
          >
            {t('links.twitter')}
          </a>
        )
      },
      {
        key: 'authorBilibili',
        title: t('links.authorBilibili'),
        icon: <Bilibili className="w-4 h-4" />,
        label: (
          <a
            href="https://space.bilibili.com/393134139"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_bilibili', {});
            }}
          >
            {t('links.authorBilibili')}
          </a>
        )
      },
      {
        key: 'buymeacoffee',
        title: t('links.buyMeACoffee'),
        icon: <Coffee className="w-4" />,
        label: (
          <a
            href="https://www.buymeacoffee.com/korbinzhao"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_buycoffee', {});
            }}
          >
            {t('links.buyMeACoffee')}
          </a>
        )
      },
      {
        key: 'feedmycat',
        title: t('links.feedMyCat'),
        icon: <Cat className="w-4" />,
        label: (
          <a
            href="https://afdian.net/a/wantian"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_feedcat', {});
            }}
          >
            {t('links.feedMyCat')}
          </a>
        )
      },
      {
        key: 'downloadApp',
        title: t('links.downloadApp'),
        icon: <DownloadCloud className="w-4 animate-bounce" />,
        label: (
          <a
            href="https://github.com/revezone/revezone/releases"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              submitUserEvent('bottombar_click_downloadapp', {});
            }}
          >
            {t('links.downloadApp')}
          </a>
        )
      }
    ],
    [langCode]
  );

  return (
    <div className="bottom-toolbar absolute h-8 pr-4 bottom-0 right-0 flex items-center text-slate-600">
      <a
        className="mr-2 flex items-center"
        href="https://github.com/revezone/revezone"
        target="_blank"
        rel="noreferrer"
        title={t('operation.giveAStar')}
        onClick={() => {
          submitUserEvent('bottombar_click_github', {});
        }}
      >
        <GithubCircle className="w-4 h-4"></GithubCircle>
      </a>
      <DownloadApp from="bottombar" />
      <a
        className="mr-2 flex items-center"
        href="https://afdian.net/a/wantian"
        target="_blank"
        rel="noreferrer"
        title={t('links.feedMyCat')}
        onClick={() => {
          submitUserEvent('bottombar_click_feedcat', {});
        }}
      >
        <Cat className="w-4 h-4"></Cat>
      </a>
      <a
        className="mr-2 flex items-center"
        href="https://www.buymeacoffee.com/korbinzhao"
        target="_blank"
        rel="noreferrer"
        title={t('links.buyMeACoffee')}
        onClick={() => {
          submitUserEvent('bottombar_click_buycoffee', {});
        }}
      >
        <Coffee className="w-4 h-4"></Coffee>
      </a>
      <span title="Setting" className="flex items-center mr-2">
        <Settings
          className="w-4 h-4 cursor-pointer"
          onClick={() => {
            setSystemSettingVisible(true);
            submitUserEvent('bottombar_click_systemsetting', {});
          }}
        ></Settings>
      </span>
      <span title="Help" className="flex items-center">
        <Dropdown menu={{ items: helpMenu }}>
          <HelpCircle className="w-4 h-4 cursor-pointer"></HelpCircle>
        </Dropdown>
      </span>
      <SystemSettings
        visible={systemSettingVisible}
        setSystemSettingVisible={setSystemSettingVisible}
        onCancel={() => setSystemSettingVisible(false)}
      ></SystemSettings>
    </div>
  );
}
