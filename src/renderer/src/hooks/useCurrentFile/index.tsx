import { currentFileAtom, selectedKeysAtom, focusItemAtom } from '@renderer/store/jotai';
import { setCurrentFileToLocal, setSelectedKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { RevezoneFile, RevezoneFileTree, RevezoneFolder } from '@renderer/types/file';
import useFileTree from '../useFileTree';
import useOpenKeys from '../useOpenKeys';

export default function useCurrentFile() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const { addOpenKeys } = useOpenKeys();
  const [, setFocusItem] = useAtom(focusItemAtom);
  const { fileTree } = useFileTree();

  const findFileParentIds = useCallback(
    (fileId: string, fileTree: RevezoneFileTree, parentIds: string[] = []) => {
      let parentItem;

      const items = Object.values(fileTree);

      for (const item of items) {
        if (item.children?.includes(fileId)) {
          parentItem = item;
          break;
        }
      }

      if (parentItem) {
        const parentId = parentItem.data.id;
        parentIds.push(parentId);
        parentIds = [...parentIds, ...findFileParentIds(parentId, fileTree, parentIds)];
      }

      return parentIds;
    },
    []
  );

  const updateCurrentFile = useCallback(
    async (fileInfo: RevezoneFile | undefined) => {
      const fileId = fileInfo?.id;
      const keys = fileId ? [fileId] : [];
      setSelectedKeys(keys);
      setSelectedKeysToLocal(keys);

      setCurrentFileToLocal(fileInfo);
      setCurrentFile(fileInfo);

      setFocusItem(fileId || '');

      if (fileId) {
        const parentIds = findFileParentIds(fileId, fileTree);

        if (parentIds.length) {
          addOpenKeys(parentIds);
        }
      }

      return fileInfo;
    },
    [fileTree]
  );

  return { currentFile, selectedKeys, updateCurrentFile, setCurrentFile };
}
