import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useFileTree from '../useFileTree';
import useCurrentFile from '../useCurrentFile';

export default function useAddFolder() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();

  const addFolder = useCallback(async () => {
    await fileTreeIndexeddbStorage.addFolder();
    updateCurrentFile(undefined);
    getFileTree();
  }, []);

  return { addFolder };
}
