import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { PencilLine } from 'lucide-react';
import { submiteUserEvent } from '@renderer/statistics';
import { isInRevezoneApp } from '@renderer/utils/navigator';
import { useTranslation } from 'react-i18next';
import CustomFontModal from '../CustomFontModal';

export default function CustomFont() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return isInRevezoneApp ? (
    <>
      <div
        key="custom-font"
        className={`dropdown-menu-item dropdown-menu-item-base`}
        title={t('menu.loadCustomFont')}
        onClick={() => {
          setIsModalOpen(true);
          submiteUserEvent('revedraw_click_customfont', {});
        }}
      >
        {t('menu.customFont')}
      </div>
      <CustomFontModal open={isModalOpen} closeModal={() => setIsModalOpen(false)} />
    </>
  ) : (
    <p
      className="flex justify-start items-center cursor-pointer px-3 py-2 text-sm text-gray-400"
      onClick={() => window.open('https://github.com/revezone/revezone/releases')}
    >
      <Tooltip title={t('menu.downloadApp')}>
        <span className="pl-3">{t('menu.customFont')}</span>
      </Tooltip>
    </p>
  );
}
