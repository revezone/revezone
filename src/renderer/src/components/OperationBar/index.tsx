import { useCallback } from 'react';
import { message } from 'antd';
import { FileTree, RevenoteFileType, OnFolderOrFileAddProps } from '@renderer/types/file';
import { useTranslation } from 'react-i18next';
import { currentFileIdAtom, currentFolderIdAtom, fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { FolderPlus, Palette, FileType } from 'lucide-react';

interface Props {
  size: 'small' | 'middle' | 'large';
  folderId: string | undefined;
  onAdd?: ({ fileId, folderId, type }: OnFolderOrFileAddProps) => void;
}

export default function AddFile(props: Props) {
  const { folderId, size = 'middle', onAdd } = props;
  const [, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setCurrentFolderId] = useAtom(currentFolderIdAtom);
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

  const getSizeClassName = useCallback(() => {
    switch (size) {
      case 'small':
        return 'h-4';
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
    <>
      <span title="Add a folder">
        <FolderPlus className="h-4 w-4 text-current cursor-pointer mr-5" onClick={addFolder} />
      </span>
      <span title="Add a note">
        <FileType
          className={`${getSizeClassName()} text-current cursor-pointer mr-5 menu-icon`}
          onClick={(e) => {
            e.stopPropagation();
            addFile(folderId, 'note', fileTree);
          }}
        />
      </span>
      <span title="Add a board">
        <Palette
          className={`${getSizeClassName()} text-current cursor-pointer mr-5 menu-icon`}
          onClick={(e) => {
            e.stopPropagation();
            addFile(folderId, 'board', fileTree);
          }}
        />
      </span>
    </>
  );
}
