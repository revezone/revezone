import { useCallback, useEffect } from 'react';
import { FolderPlus, Palette, FileType } from 'lucide-react';
import useAddFile from '@renderer/hooks/useAddFile';
import { useTranslation } from 'react-i18next';
import useAddFolder from '@renderer/hooks/useAddFolder';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import useCurrentFolderId from '@renderer/hooks/useCurrentFolderId';
import { driver } from 'driver.js';
import { getIsUserGuideShowed, setIsUserGuideShowed } from '../../store/localstorage';

import 'driver.js/dist/driver.css';

import './index.css';

interface Props {
  size: 'small' | 'middle' | 'large';
  className?: string;
}

export default function OperationBar(props: Props) {
  const { size = 'middle', className } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { t } = useTranslation();
  const { model: tabModel } = useTabJsonModel();

  const { currentFolderId } = useCurrentFolderId();

  const getSizeClassName = useCallback(() => {
    switch (size) {
      case 'small':
        return 'h-5';
      case 'middle':
        return 'h-5';
      case 'large':
        return 'h-6';
      default:
        return 'h-5';
    }
  }, [size]);

  useEffect(() => {
    const isUserGuideShowed = getIsUserGuideShowed();

    if (!isUserGuideShowed) {
      setIsUserGuideShowed(true);
      const driverObj = driver({
        popoverClass: 'driverjs-theme',
        stagePadding: 4
      });
      driverObj.highlight({
        element: '#add-board-button',
        popover: {
          title: t('operation.addBoard'),
          description: t('operation.addBoardDesc')
        }
      });
    }
  }, []);

  return (
    <div className={`revezone-menu-toolbar flex items-center pl-5 h-10 text-sm ${className}`}>
      <span
        title={t('operation.addFolder')}
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFolder('New Folder');
        }}
      >
        <FolderPlus className={`${getSizeClassName()} text-current`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addFolder')}</span>
      </span>
      <span
        title={t('operation.addBoard')}
        id="add-board-button"
        className="operation-item flex items-center mr-3 cursor-pointer relative"
        onClick={(e) => {
          e.stopPropagation();
          addFile('New Board', 'board', tabModel, currentFolderId);
        }}
      >
        <Palette
          className={`${getSizeClassName()} text-current cursor-pointer menu-icon animate-breath`}
        />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addBoard')}</span>
      </span>
      <span
        title={t('operation.addNote')}
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile('New Note', 'note', tabModel, currentFolderId);
        }}
      >
        <FileType className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addNote')}</span>
      </span>
    </div>
  );
}
