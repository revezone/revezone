import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import { fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';

export default function useFileTree() {
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

  const getFileTree = useCallback(async () => {
    const tree = await fileTreeIndexeddbStorage.getFileTree();
    setFileTree(tree);
    return tree;
  }, []);

  return { fileTree, getFileTree };
}
