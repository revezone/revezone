import { useCallback } from 'react';
import { Dropdown } from 'antd';
import RevezoneLogo from '../RevezoneLogo';
import { HardDrive, UploadCloud, MoreVertical, Import } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher/index';
import PublicBetaNotice from '@renderer/components/PublicBetaNotice';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';

import ImportFiles from '../ImportFiles';

export default function RevezoneBrand() {
  const { t } = useTranslation();

  const { switchToWelcomePage, model: tabModel } = useTabJsonModel();

  const onLogoClick = useCallback(() => {
    switchToWelcomePage();
  }, [tabModel]);

  const storageTypeItems = [
    {
      key: 'local',
      icon: <HardDrive className="w-4 mr-1"></HardDrive>,
      label: t('storage.local')
    },
    {
      key: 'cloud',
      icon: <UploadCloud className="w-4 mr-1"></UploadCloud>,
      disabled: true,
      label: t('storage.cloud')
    }
  ];
  return (
    <div className="flex flex-col mb-1 pl-5 pr-6 pt-0 justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <RevezoneLogo size="small" onClick={onLogoClick} />
          <span className="text-sm whitespace-nowrap">&nbsp;-&nbsp;{t('text.alpha')}</span>
          <PublicBetaNotice />
        </div>
        <Dropdown
          trigger={['hover']}
          menu={{
            items: [
              {
                key: 'import',
                label: <ImportFiles />,
                icon: <Import className="w-4 h-4" />
              }
            ]
          }}
        >
          <MoreVertical className="w-3 h-3 cursor-pointer" />
        </Dropdown>
      </div>
      <div className="flex justify-start">
        <div className="mr-2 whitespace-nowrap">
          <Dropdown menu={{ items: storageTypeItems }}>
            <span className="text-slate-500 flex items-center cursor-pointer text-sm">
              <HardDrive className="w-4 mr-1"></HardDrive>
              {t('storage.local')}
            </span>
          </Dropdown>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
