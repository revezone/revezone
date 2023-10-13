import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useCurrentFile from '../useCurrentFile';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { dbclickMenuTreeItemAfterCreate } from '@renderer/utils/dom';
import useFileTree from '../useFileTree';

export default function useAddFolder() {
  const { updateCurrentFile } = useCurrentFile();
  const { getFileTree } = useFileTree();

  const addFolder = useCallback(async (name: string, parentId?: string) => {
    const folder = await fileTreeIndexeddbStorage.addFolder(name, parentId);
    setRenamingMenuItemIdToLocal(folder.id);
    updateCurrentFile(undefined);

    dbclickMenuTreeItemAfterCreate();

    getFileTree();
  }, []);

  return { addFolder };
}
