import { DownloadCloud } from 'lucide-react';
import { getIsInRevenoteApp } from '@renderer/utils/navigator';
import { useTranslation } from 'react-i18next';

const isInRevenoteApp = getIsInRevenoteApp();

export default function DownloadApp({ className = '' }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <a
      className={`mr-2 flex items-center ${className}`}
      href="https://github.com/revenote/revenote/releases"
      target="_blank"
      rel="noreferrer"
      title={t('welcome.downloadApp')}
    >
      <DownloadCloud
        className={`w-4 h-4 ${!isInRevenoteApp ? 'animate-bounce' : null}`}
      ></DownloadCloud>
    </a>
  );
}
