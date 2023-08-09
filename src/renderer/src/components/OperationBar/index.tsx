import { useCallback } from 'react';
import { OnFolderOrFileAddProps } from '@renderer/types/file';
import { currentFileAtom, currentFolderIdAtom, fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { FolderPlus, Palette, FileType } from 'lucide-react';
import useAddFile from '@renderer/hooks/useAddFile';

import './index.css';
import { useTranslation } from 'react-i18next';

interface Props {
  size: 'small' | 'middle' | 'large';
  folderId: string | undefined;
  className?: string;
  onAdd?: ({ fileId, folderId, type }: OnFolderOrFileAddProps) => void;
}

export default function OperationBar(props: Props) {
  const { folderId, size = 'middle', className, onAdd } = props;
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [, setCurrentFolderId] = useAtom(currentFolderIdAtom);
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);
  const [addFile] = useAddFile({ onAdd });
  const { t } = useTranslation();

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

  const addFolder = useCallback(async () => {
    const folder = await menuIndexeddbStorage.addFolder();
    const tree = await menuIndexeddbStorage.getFileTree();
    setFileTree(tree);
    setCurrentFolderId(folder.id);
    setCurrentFile(undefined);

    onAdd?.({ folderId: folder.id, type: 'folder' });
  }, []);

  return (
    <div className={`revezone-menu-toolbar flex items-center pl-5 h-10 ${className}`}>
      <span
        title={t('operation.addFolder')}
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={addFolder}
      >
        <FolderPlus className={`${getSizeClassName()} text-current`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addFolder')}</span>
      </span>
      <span
        title={t('operation.addBoard')}
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile(folderId, 'board', fileTree);
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
          addFile(folderId, 'note', fileTree);
        }}
      >
        <FileType className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">{t('operation.addNote')}</span>
      </span>
    </div>
  );
}
