import { useCallback } from 'react';
import { RevezoneFile, RevezoneFileTree, RevezoneFolder } from '@renderer/types/file';
import { Model } from 'flexlayout-react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useDeleteFile from '../useDeleteFile';
import useFileTree from '../useFileTree';

export default function useDeleteFolder() {
  const { deleteFile } = useDeleteFile();
  const { getFileTree } = useFileTree();

  const getChildren = useCallback(
    (treeItemId: string, tree: RevezoneFileTree, children: string[] = []): string[] => {
      const _children = tree[treeItemId]?.children || [];

      children = [...children, ..._children] as string[];

      _children.forEach((childId) => {
        if (tree[childId]?.children) {
          const _children2 = getChildren(childId as string, tree, children);
          children = [...children, ..._children2];
        }
      });

      return Array.from(new Set(children));
    },
    []
  );

  const deleteFolder = useCallback(
    async (folder: RevezoneFolder, tabModel: Model) => {
      const fileTree = await fileTreeIndexeddbStorage.getFileTree();

      if (!fileTree) return;

      const childrenIdsInFolder = getChildren(folder.id, fileTree, []);

      for await (const childId of childrenIdsInFolder) {
        if (childId.startsWith('file_')) {
          const file = fileTree[childId].data;
          await deleteFile(file as RevezoneFile, tabModel);
        } else if (childId.startsWith('folder_')) {
          await fileTreeIndexeddbStorage.deleteFolder(childId);
        }
      }

      await fileTreeIndexeddbStorage.deleteFolder(folder.id);

      await getFileTree();
    },
    [fileTreeIndexeddbStorage]
  );

  return { deleteFolder };
}
