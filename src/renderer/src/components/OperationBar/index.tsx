import { useCallback } from 'react';
import { FileTree, RevenoteFileType, OnFolderOrFileAddProps } from '@renderer/types/file';
import { currentFileIdAtom, currentFolderIdAtom, fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { FolderPlus, Palette, FileType } from 'lucide-react';

import './index.css';

interface Props {
  size: 'small' | 'middle' | 'large';
  folderId: string | undefined;
  className?: string;
  onAdd?: ({ fileId, folderId, type }: OnFolderOrFileAddProps) => void;
}

export default function AddFile(props: Props) {
  const { folderId, size = 'middle', className, onAdd } = props;
  const [, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setCurrentFolderId] = useAtom(currentFolderIdAtom);
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

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
    setCurrentFileId(undefined);

    onAdd?.({ folderId: folder.id, type: 'folder' });
  }, []);

  const addFile = useCallback(
    async (folderId: string | undefined, type: RevenoteFileType, fileTree: FileTree) => {
      let _folderId = folderId || fileTree?.[0]?.id;

      if (!_folderId) {
        _folderId = (await menuIndexeddbStorage.addFolder())?.id;
      }

      const file = await menuIndexeddbStorage.addFile(_folderId, type);
      const tree = await menuIndexeddbStorage.getFileTree();
      setFileTree(tree);

      setCurrentFileId(file.id);

      onAdd?.({ fileId: file.id, folderId: _folderId, type: 'file' });
    },
    []
  );

  return (
    <div className={`revenote-menu-toolbar flex items-center pl-5 h-10 ${className}`}>
      <span
        title="Add a folder"
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={addFolder}
      >
        <FolderPlus className={`${getSizeClassName()} text-current`} />
        <span className="operation-btn-desc ml-1 transition-all">Add a folder</span>
      </span>
      <span
        title="Add a note"
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile(folderId, 'note', fileTree);
        }}
      >
        <FileType className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">Add a note</span>
      </span>
      <span
        title="Add a board"
        className="operation-item flex items-center mr-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          addFile(folderId, 'board', fileTree);
        }}
      >
        <Palette className={`${getSizeClassName()} text-current cursor-pointer menu-icon`} />
        <span className="operation-btn-desc ml-1 transition-all">Add a board</span>
      </span>
    </div>
  );
}
