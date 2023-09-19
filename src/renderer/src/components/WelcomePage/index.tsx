import RevezoneLogo from '../RevezoneLogo';
import { Twitter, Coffee, Cat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bilibili, GithubCircle } from '../../icons';
import DownloadApp from '../DownloadApp';
import { isInRevezoneApp } from '@renderer/utils/navigator';
import { submitUserEvent } from '@renderer/utils/statistics';
import PublicBetaNotice from '@renderer/components/PublicBetaNotice';
import AttentionAnimation from '../AttentionAnimation';

function WelcomeContent() {
  const { t } = useTranslation();

  return (
    <div className="revezone-welcome-page relative w-full h-full flex pt-6 pb-10 justify-center text-slate-400">
      <div className="content w-2/3 overflow-scroll text-sm">
        <div className="reve-text-link mb-6">
          <RevezoneLogo size="large" url="https://revezone.com" />
          <span className="text-xl"> - {t('text.alpha')}</span>
          <PublicBetaNotice />
        </div>
        <p className="mb-6">{t('welcome.productDesc')}</p>
        <p className="mb-6">{t('publicBeta.description')}</p>
        <p className="mb-6 reve-text-link">
          {!isInRevezoneApp ? t('welcome.onlineTry') : null} {t('welcome.downloadApp')}{' '}
          <DownloadApp className="ml-2" from="welcomepage" />
        </p>
        <p className="mb-6 text-sm  text-slate-600">{t('welcome.operationTip')}</p>
        <div className="mb-6 text-sm">
          <h2 className="mb-2 text-base">{t('welcome.operationGuide')}</h2>
          <p className="mb-2">{t('welcome.operationDetailDesc')}</p>
        </div>
        <div className="text-sm">
          <h2 className="mb-2 text-base">{t('links.title')}</h2>
          <p className="mb-2">
            <a
              href="https://github.com/revezone/revezone"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submitUserEvent('welcomepage_click_github', {});
              }}
              className="reve-text-link relative"
            >
              <AttentionAnimation />
              <GithubCircle className="w-4 h-4 mr-2" /> {t('links.github')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://space.bilibili.com/393134139"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submitUserEvent('welcomepage_click_bilibili', {});
              }}
              className="reve-text-link relative"
            >
              <AttentionAnimation />
              <Bilibili className="w-4 h-4 mr-2" /> {t('links.authorBilibili')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://twitter.com/TheReveZone"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submitUserEvent('welcomepage_click_twitter', {});
              }}
              className="reve-text-link"
            >
              <Twitter className="w-4 h-4 mr-2" /> {t('links.twitter')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://afdian.net/a/wantian"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submitUserEvent('welcomepage_click_feedcat', {});
              }}
              className="reve-text-link"
            >
              <Cat className="w-4 h-4 mr-2" /> {t('links.feedMyCat')}
            </a>
          </p>
          <p className="mb-2">
            <a
              href="https://www.buymeacoffee.com/korbinzhao"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                submitUserEvent('welcomepage_click_buycoffee', {});
              }}
              className="reve-text-link"
            >
              <Coffee className="w-4 h-4 mr-2" /> {t('links.buyMeACoffee')}
            </a>
          </p>
        </div>
      </div>
      <div className="copyright absolute bottom-0 text-center w-full h-8 text-sm">
        Copyright © 2023{' '}
        <a
          href="https://twitter.com/TheReveZone"
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            submitUserEvent('welcomepage_click_twitter', {});
          }}
        >
          Revezone
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
