import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';

export default function useFileTree() {
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

  const getFileTree = useCallback(async () => {
    const tree = await fileTreeIndexeddbStorage.getFileTree();

    // DEBUG: check files not deleted unexpected
    if (localStorage.getItem('is_debug') === 'true') {
      if (tree) {
        let notes = await blocksuiteStorage.getAllPageIds();
        notes = notes.filter((id) => !tree[id]);
        let boards = await boardIndexeddbStorage.getAllBoardIds();
        boards = boards.filter((id) => !tree[id]);

        tree.root.children = [...((tree.root.children as string[]) || []), ...notes, ...boards];

        notes.forEach((fileId) => {
          tree[fileId] = {
            index: fileId,
            data: { id: fileId, name: fileId, type: 'note', gmtCreate: '', gmtModified: '' }
          };
        });

        boards.forEach((fileId) => {
          tree[fileId] = {
            index: fileId,
            data: { id: fileId, name: fileId, type: 'board', gmtCreate: '', gmtModified: '' }
          };
        });
      }
    }

    tree && setFileTree(tree);

    return tree;
  }, []);

  return { fileTree, getFileTree, setFileTree };
}
