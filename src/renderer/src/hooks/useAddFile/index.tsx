import { useCallback } from 'react';
import useFileTree from '@renderer/hooks/useFileTree';
import useCurrentFile from '../useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useOpenKeys from '../useOpenKeys';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { dbclickMenuTreeItemAfterCreate } from '@renderer/utils/dom';
import useTabJsonModel from '../useTabJsonModel';
import { Model } from 'flexlayout-react';

export default function useAddFile() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();
  const { addOpenKeys } = useOpenKeys();
  const { updateTabJsonModelWhenCurrentFileChanged } = useTabJsonModel();

  const addFile = useCallback(
    async (
      name: string,
      type: 'board' | 'note',
      tabModel: Model | undefined,
      parentId?: string
    ) => {
      console.log('--- addfile ---', tabModel);

      if (!tabModel) return;

      const file = await fileTreeIndexeddbStorage.addFile(name, type, parentId);

      parentId && addOpenKeys([parentId]);
      setRenamingMenuItemIdToLocal(file.id);

      getFileTree();

      dbclickMenuTreeItemAfterCreate();

      console.log('--- addFile ---', file);

      updateCurrentFile(file);

      updateTabJsonModelWhenCurrentFileChanged(file, tabModel);
    },
    []
  );

  return { addFile };
}
