import RevezoneLogo from '../RevezoneLogo';
import { Twitter, Github, Coffee, Cat, FolderPlus, FileType, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bilibili } from '../../icons';
import DownloadApp from '../DownloadApp';
import { isInRevezoneApp } from '@renderer/utils/navigator';

import './index.css';
import { submiteUserEvent } from '@renderer/statistics';

function WelcomeContent() {
  const { t } = useTranslation();

  return (
    <div className="revezone-welcome-page w-full h-full flex pt-10 pb-10 justify-center text-slate-400">
      <div className="content w-2/3 overflow-scroll">
        <div className="flex items-center mb-6">
          <RevezoneLogo size="large" url="https://revezone.com" />
          <span className="text-xl"> - {t('text.alpha')}</span>
        </div>
        <p className="mb-6 text-sm">{t('welcome.productDesc')}</p>
        <p className="mb-6 text-sm">{t('publicBeta.description')}</p>
        <p className="mb-6 text-sm flex items-center">
          {!isInRevezoneApp ? t('welcome.onlineTry') : null} {t('welcome.downloadApp')}{' '}
          <DownloadApp className="ml-2" from="welcomepage" />
        </p>
        <p className="mb-6 text-sm  text-slate-600">{t('welcome.operationTip')}</p>
        <div className="mb-6">
          <h2 className="mb-2 text-base">{t('welcome.operationGuide')}</h2>
          <p className="mb-2">{t('welcome.operationDetailDesc')}</p>
          <p className="mb-2">
            <FolderPlus className="mr-2 w-4 h-4" />
            {t('operation.addFolder')}
          </p>
          <p className="mb-2">
            <FileType className="mr-2 w-4 h-4" />
            {t('operation.addNote')}: {t('description.noteDesc')}
          </p>
          <p className="mb-2">
            <Palette className="mr-2 w-4 h-4" />
            {t('operation.addBoard')}: {t('description.boardDesc')}
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-base">{t('links.title')}</h2>
          <p className="mb-2">
            <a
              href="https://github.com/revezone/revezone"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_github', {});
              }}
            >
              <Github className="w-4 h-4" /> {t('links.github')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://twitter.com/TheReveZone"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_twitter', {});
              }}
            >
              <Twitter className="w-4 h-4" /> {t('links.twitter')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://space.bilibili.com/393134139"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_bilibili', {});
              }}
            >
              <Bilibili className="w-4 h-4" /> {t('links.authorBilibili')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://twitter.com/korbinzhao"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_twitter', {});
              }}
            >
              <Twitter className="w-4 h-4" /> {t('links.authorTwitter')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://afdian.net/a/wantian"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_feedcat', {});
              }}
            >
              <Cat className="w-4 h-4" /> {t('links.feedMyCat')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://www.buymeacoffee.com/korbinzhao"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submiteUserEvent('welcomepage_click_buycoffee', {});
              }}
            >
              <Coffee className="w-4 h-4" /> {t('links.buyMeACoffee')}
            </a>
          </p>
        </div>
      </div>
      <div className="copyright absolute bottom-0 text-center">
        Copyright © 2023{' '}
        <a
          href="https://twitter.com/korbinzhao"
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            submiteUserEvent('welcomepage_click_twitter', {});
          }}
        >
          Korbin Zhao
        </a>
        . All rights reserved.
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 200);
  }, []);

  return !loading ? <WelcomeContent /> : null;
}
