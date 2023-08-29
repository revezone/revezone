import { useCallback } from 'react';
import { RevezoneFile, RevezoneFolder } from '@renderer/types/file';
import { Model } from 'flexlayout-react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useDeleteFile from '../useDeleteFile';
import useFileTree from '../useFileTree';

export default function useDeleteFolder() {
  const { deleteFile } = useDeleteFile();
  const { getFileTree } = useFileTree();

  const deleteFolder = useCallback(
    async (folder: RevezoneFolder, tabModel: Model) => {
      const fileTree = await fileTreeIndexeddbStorage.getFileTree();

      if (!fileTree) return;

      await fileTreeIndexeddbStorage.deleteFolder(folder.id);

      const fileIdsInFolder = fileTree?.[folder.id].children || [];

      const fileDeletePromises = fileIdsInFolder.map(async (fileId) => {
        const file = fileTree[fileId].data;
        deleteFile(file as RevezoneFile, tabModel);
      });

      await Promise.all(fileDeletePromises);

      await getFileTree();
    },
    [fileTreeIndexeddbStorage]
  );

  return { deleteFolder };
}
