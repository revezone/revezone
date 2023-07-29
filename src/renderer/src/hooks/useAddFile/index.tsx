import { useCallback } from 'react';
import { FileTree, RevenoteFileType, OnFolderOrFileAddProps } from '@renderer/types/file';
import { fileTreeAtom, currentFileAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';

interface Props {
  onAdd?: ({ fileId, folderId, type }: OnFolderOrFileAddProps) => void;
}

export default function useAddFile({ onAdd }: Props) {
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [, setFileTree] = useAtom(fileTreeAtom);

  const addFile = useCallback(
    async (folderId: string | undefined, type: RevenoteFileType, fileTree: FileTree) => {
      let _folderId = folderId || fileTree?.[0]?.id;

      if (!_folderId) {
        _folderId = (await menuIndexeddbStorage.addFolder())?.id;
      }

      const file = await menuIndexeddbStorage.addFile(_folderId, type);

      const tree = await menuIndexeddbStorage.getFileTree();
      setFileTree(tree);

      setCurrentFile(file);

      onAdd?.({ fileId: file.id, folderId: _folderId, type: 'file' });
    },
    []
  );

  return [addFile];
}
