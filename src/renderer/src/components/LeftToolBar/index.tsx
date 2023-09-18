import { useCallback } from 'react';
import useAddFile from '@renderer/hooks/useAddFile';
import { useTranslation } from 'react-i18next';
import useAddFolder from '@renderer/hooks/useAddFolder';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import useCurrentFolderId from '@renderer/hooks/useCurrentFolderId';
import { TldrawIcon } from '@renderer/icons';
import { Tooltip } from 'antd';
import {
  FolderPlus,
  Palette,
  FileType,
  Cat,
  Coffee,
  HelpCircle,
  ArrowUpRightFromCircle,
  Twitter,
  DownloadCloud,
  Settings
} from 'lucide-react';
import { Dropdown } from 'antd';
import { useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { langCodeAtom } from '@renderer/store/jotai';
import { submitUserEvent } from '@renderer/utils/statistics';
import SystemSettings from '../SystemSettings';
import { GithubCircle, Bilibili } from '@renderer/icons';
import DownloadApp from '../DownloadApp';

import 'driver.js/dist/driver.css';

interface Props {
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

export default function LeftToolBar(props: Props) {
  const { size = 'middle', className = '' } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { t } = useTranslation();
  const { model: tabModel } = useTabJsonModel();
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

  const { currentFolderId } = useCurrentFolderId();

  const getSizeClassName = useCallback(() => {
    switch (size) {
      case 'small':
        return 'w-5 h-5';
      case 'middle':
        return 'w-5 h-5';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  }, [size]);
  return (
    <div
      className={`flex flex-col items-center justify-between h-[calc(100%-80px)] p-2 w-8 border-r ${className}`}
    >
      <div className="flex flex-col items-center">
        <span
          title={t('operation.addFolder')}
          className="operation-item flex items-center mb-5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            addFolder('New Folder');
          }}
        >
          <Tooltip title={t('operation.addFolder')} placement="right">
            <FolderPlus className={`${getSizeClassName()} text-current`} />
          </Tooltip>
        </span>
        <span
          title={t('operation.addBoard')}
          id="add-board-button"
          className="operation-item flex items-center mb-5 cursor-pointer relative"
          onClick={(e) => {
            e.stopPropagation();
            addFile('New Excalidarw', 'board', tabModel, currentFolderId);
          }}
        >
          <Tooltip title={t('operation.addBoard')} placement="right">
            <Palette className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
          </Tooltip>
        </span>
        <span
          title={t('operation.addTldraw')}
          id="add-tldraw-button"
          className="operation-item flex items-center mb-5 cursor-pointer relative"
          onClick={(e) => {
            e.stopPropagation();
            addFile('New Tldraw', 'tldraw', tabModel, currentFolderId);
          }}
        >
          <Tooltip title={t('operation.addTldraw')} placement="right">
            <span>
              <TldrawIcon className={`w-5 h-5 text-current cursor-pointer menu-icon`} />
            </span>
          </Tooltip>
        </span>
        {/* <span
        title={t('operation.addMindmap')}
        id="add-mindmap-button"
        className="operation-item flex items-center mt-3 cursor-pointer relative"
        onClick={(e) => {
            e.stopPropagation();
            addFile('New Mindmap', 'mindmap', tabModel, currentFolderId);
        }}
        >
        <MindMapIcon className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addMindmap')}</span>
        </span> */}
        <span
          title={t('operation.addNote')}
          className="operation-item flex items-center mb-5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            addFile('New Note', 'note', tabModel, currentFolderId);
          }}
        >
          <Tooltip title={t('operation.addNote')} placement="right">
            <FileType className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
          </Tooltip>
        </span>
      </div>
      <div className="flex flex-col items-center pb-4">
        <Tooltip title={t('links.downloadApp')} placement="right">
          <span>
            <DownloadApp from="bottombar" className="mb-3 w-4 h-4" />
          </span>
        </Tooltip>
        <a
          id="give-star-button"
          className="mb-3 reve-text-link"
          href="https://github.com/revezone/revezone"
          target="_blank"
          rel="noreferrer"
          title={t('operation.giveAStar')}
          onClick={() => {
            submitUserEvent('bottombar_click_github', {});
          }}
        >
          <Tooltip title={t('operation.giveAStar')} placement="right">
            <span>
              <GithubCircle className="w-4 h-4" />
            </span>
          </Tooltip>
        </a>
        <span title="Setting" className="reve-text-link mb-3">
          <Tooltip title={t('operation.systemSetting')} placement="right">
            <Settings
              id="system-setting-button"
              className="w-4 h-4 cursor-pointer"
              onClick={() => {
                setSystemSettingVisible(true);
                submitUserEvent('bottombar_click_systemsetting', {});
              }}
            />
          </Tooltip>
        </span>
        <span title="Help" className="reve-text-link">
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
    </div>
  );
}
