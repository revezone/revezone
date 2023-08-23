import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useFileTree from '../useFileTree';
import useCurrentFile from '../useCurrentFile';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { dbclickMenuTreeItemAfterCreate } from '@renderer/utils/dom';

export default function useAddFolder() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();

  const addFolder = useCallback(async () => {
    const folder = await fileTreeIndexeddbStorage.addFolder();
    setRenamingMenuItemIdToLocal(folder.id);
    updateCurrentFile(undefined);
    getFileTree();

    dbclickMenuTreeItemAfterCreate();
  }, []);

  return { addFolder };
}
