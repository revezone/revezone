import { useCallback } from 'react';
import { FolderPlus, Palette, FileType } from 'lucide-react';
import useAddFile from '@renderer/hooks/useAddFile';
import { useTranslation } from 'react-i18next';
import useAddFolder from '@renderer/hooks/useAddFolder';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import useCurrentFolderId from '@renderer/hooks/useCurrentFolderId';
import { TldrawIcon } from '@renderer/icons';
import { Tooltip } from 'antd';

import 'driver.js/dist/driver.css';

interface Props {
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

export default function LeftToolBar(props: Props) {
  const { size = 'middle', className } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { t } = useTranslation();
  const { model: tabModel } = useTabJsonModel();

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
    <div className={`flex flex-col items-center p-1 h-full border-r ${className}`}>
      <span
        title={t('operation.addFolder')}
        className="operation-item flex items-center mt-5 cursor-pointer"
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
        className="operation-item flex items-center mt-5 cursor-pointer relative"
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
        className="operation-item flex items-center mt-5 cursor-pointer relative"
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
        className="operation-item flex items-center mt-5 cursor-pointer"
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
  );
}
