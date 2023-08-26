import { useCallback, useMemo } from 'react';
import { FolderPlus, Palette, FileType } from 'lucide-react';
import useAddFile from '@renderer/hooks/useAddFile';
import { useTranslation } from 'react-i18next';
import useAddFolder from '@renderer/hooks/useAddFolder';

import './index.css';
import useTabList from '@renderer/hooks/useTabList';
import { useAtom } from 'jotai';
import { selectedKeysAtom } from '@renderer/store/jotai';

interface Props {
  size: 'small' | 'middle' | 'large';
  className?: string;
}

export default function OperationBar(props: Props) {
  const { size = 'middle', className } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { t } = useTranslation();
  const { tabList } = useTabList();
  const [selectedKeys] = useAtom(selectedKeysAtom);

  const currentFolderId = useMemo(() => {
    const folderIds = selectedKeys.filter((key) => key.startsWith('folder_'));
    return folderIds?.[0];
  }, [selectedKeys]);

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

  return (
    <div className={`revezone-menu-toolbar flex items-center pl-5 h-10 ${className}`}>
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
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile('New Board', 'board', tabList, currentFolderId);
        }}
      >
        <Palette className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addBoard')}</span>
      </span>
      <span
        title={t('operation.addNote')}
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile('New Note', 'note', tabList, currentFolderId);
        }}
      >
        <FileType className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addNote')}</span>
      </span>
    </div>
  );
}
