import { Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { useAtom } from 'jotai';
import { langCodeAtom } from '@renderer/store/jotai';
import { submiteUserEvent } from '@renderer/statistics';
import { useCallback } from 'react';

const PublicBetaNotice = () => {
  const { t } = useTranslation();
  const [langCode] = useAtom(langCodeAtom);

  const onMouseEnter = useCallback(() => {
    submiteUserEvent('publicbeta_show_notice', {});
  }, []);

  return (
    <Popconfirm
      trigger={'hover'}
      title={t('publicBeta.title')}
      description={
        <p className="w-60 whitespace-pre-wrap" onMouseEnter={onMouseEnter}>
          <span>{t('publicBeta.description')}</span>
          {langCode.startsWith('zh') ? (
            <img
              className="w-25 h-25"
              src="https://img.alicdn.com/imgextra/i4/O1CN01rXBaQt1bGC8tJAAit_!!6000000003437-0-tps-1074-885.jpg"
              alt=""
            />
          ) : null}
        </p>
      }
    >
      <HelpCircle className="w-4 h-4 ml-1 cursor-pointer"></HelpCircle>
    </Popconfirm>
  );
};

export default PublicBetaNotice;
