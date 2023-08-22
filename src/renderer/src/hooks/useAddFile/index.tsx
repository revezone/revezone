import { useCallback } from 'react';
import useFileTree from '@renderer/hooks/useFileTree';
import useCurrentFile from '../useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';

export default function useAddFile() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();

  const addFile = useCallback(async (name: string, type: 'board' | 'note', parentId?: string) => {
    const file = await fileTreeIndexeddbStorage.addFile(name, type, parentId);
    updateCurrentFile(file.id);
    getFileTree();
  }, []);

  return { addFile };
}
