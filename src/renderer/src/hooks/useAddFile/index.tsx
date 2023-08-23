import { useCallback } from 'react';
import useFileTree from '@renderer/hooks/useFileTree';
import useCurrentFile from '../useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useOpenKeys from '../useOpenKeys';

export default function useAddFile() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();
  const { addOpenKey } = useOpenKeys();

  const addFile = useCallback(async (name: string, type: 'board' | 'note', parentId?: string) => {
    const file = await fileTreeIndexeddbStorage.addFile(name, type, parentId);
    updateCurrentFile(file.id);
    getFileTree();

    parentId && addOpenKey(parentId);
  }, []);

  return { addFile };
}
