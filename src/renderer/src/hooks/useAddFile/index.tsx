import { useCallback } from 'react';
import { RevezoneFileTree, RevezoneFileType, OnFolderOrFileAddProps } from '@renderer/types/file';
import { fileTreeAtom, currentFileAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { useTranslation } from 'react-i18next';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { blocksuiteStorage } from '@renderer/store/blocksuite';

interface Props {
  onAdd?: ({ fileId, folderId, type }: OnFolderOrFileAddProps) => void;
}

const DEFAULT_BORAD_DATA = '{}';

export default function useAddFile({ onAdd }: Props) {
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [, setFileTree] = useAtom(fileTreeAtom);
  const { t } = useTranslation();

  const addFile = useCallback(
    async (folderId: string | undefined, type: RevezoneFileType, fileTree: RevezoneFileTree) => {
      let _folderId = folderId || fileTree?.[0]?.id;

      if (!_folderId) {
        _folderId = (await fileTreeIndexeddbStorage.addFolder(t('text.defaultFolder')))?.id;
      }

      const file = await fileTreeIndexeddbStorage.addFile(_folderId, type);

      if (type === 'board') {
        await boardIndexeddbStorage.addBoard(file.id, DEFAULT_BORAD_DATA);
      } else if (type === 'note') {
        await blocksuiteStorage.addPage(file.id);
      }

      const tree = await fileTreeIndexeddbStorage.getFileTree();
      setFileTree(tree);

      setCurrentFile(file);

      onAdd?.({ fileId: file.id, folderId: _folderId, type: 'file' });
    },
    []
  );

  return [addFile];
}
