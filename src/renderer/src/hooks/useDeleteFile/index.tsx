import { useCallback } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Model } from 'flexlayout-react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import useCurrentFile from '../useCurrentFile';
import useTabJsonModel from '../useTabJsonModel';
import useFileTree from '../useFileTree';

export default function useDeleteFile() {
  const { currentFile, updateCurrentFile } = useCurrentFile();
  const { deleteTab } = useTabJsonModel();
  const { getFileTree } = useFileTree();

  const deleteFile = useCallback(
    async (file: RevezoneFile, tabModel: Model) => {
      await fileTreeIndexeddbStorage.deleteFile(file.id);

      console.log('--- delete file ---', file);

      await deleteTab(file.id, tabModel);

      if (file.id === currentFile?.id) {
        updateCurrentFile(undefined);
      }

      switch (file.type) {
        case 'board':
          await boardIndexeddbStorage.deleteBoard(file.id);
          break;
        case 'note':
          await blocksuiteStorage.deletePage(file.id);
          break;
      }

      await getFileTree();
    },
    [fileTreeIndexeddbStorage, currentFile]
  );

  return { deleteFile };
}
