import { useCallback } from 'react';
import useFileTree from '@renderer/hooks/useFileTree';
import useCurrentFile from '../useCurrentFile';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import useOpenKeys from '../useOpenKeys';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { dbclickMenuTreeItemAfterCreate } from '@renderer/utils/dom';
import useTabJsonModel from '../useTabJsonModel';
import { Model } from 'flexlayout-react';
import { RevezoneFile, RevezoneFileType } from '@renderer/types/file';

export default function useAddFile() {
  const { getFileTree } = useFileTree();
  const { updateCurrentFile } = useCurrentFile();
  const { addOpenKeys } = useOpenKeys();
  const { updateTabJsonModelWhenCurrentFileChanged } = useTabJsonModel();

  const addFile = useCallback(
    async (
      name: string,
      type: RevezoneFileType,
      tabModel: Model | undefined,
      parentId?: string,
      fileData?: string
    ): Promise<RevezoneFile | undefined> => {
      console.log('--- addfile ---', tabModel);

      if (!tabModel) return;

      const file = await fileTreeIndexeddbStorage.addFile(name, type, parentId, fileData);

      parentId && addOpenKeys([parentId]);
      setRenamingMenuItemIdToLocal(file.id);

      getFileTree();

      dbclickMenuTreeItemAfterCreate();

      console.log('--- addFile ---', file);

      updateCurrentFile(file);

      updateTabJsonModelWhenCurrentFileChanged(file, tabModel);

      return file;
    },
    []
  );

  return { addFile };
}
