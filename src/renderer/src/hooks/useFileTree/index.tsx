import { useCallback } from 'react';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';

export default function useFileTree() {
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

  const getFileTree = useCallback(async () => {
    const tree = await menuIndexeddbStorage.getFileTree();
    setFileTree(tree);
    return tree;
  }, []);

  return { fileTree, getFileTree };
}
