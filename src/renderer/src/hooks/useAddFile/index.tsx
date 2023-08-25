import { useCallback } from 'react';
import useFileTree from '@renderer/hooks/useFileTree';
import useCurrentFile from '../useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useOpenKeys from '../useOpenKeys';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { dbclickMenuTreeItemAfterCreate } from '@renderer/utils/dom';
import useTabList from '../useTabList';
import { TabItem } from '@renderer/types/tabs';

export default function useAddFile() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();
  const { addOpenKey } = useOpenKeys();
  const { updateTabListWhenCurrentFileChanged } = useTabList();

  const addFile = useCallback(
    async (name: string, type: 'board' | 'note', tabList: TabItem[], parentId?: string) => {
      const file = await fileTreeIndexeddbStorage.addFile(name, type, parentId);

      parentId && addOpenKey(parentId);
      setRenamingMenuItemIdToLocal(file.id);

      getFileTree();

      dbclickMenuTreeItemAfterCreate();

      console.log('--- addFile ---', file);

      updateCurrentFile(file);

      updateTabListWhenCurrentFileChanged(file, tabList);
    },
    []
  );

  return { addFile };
}
