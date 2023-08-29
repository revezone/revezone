import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { selectedKeysAtom, fileTreeAtom, currentFileAtom } from '@renderer/store/jotai';

export default function useCurrentFolderId() {
  const [selectedKeys] = useAtom(selectedKeysAtom);
  const [fileTree] = useAtom(fileTreeAtom);
  const [currentFile] = useAtom(currentFileAtom);

  const currentFolderId = useMemo(() => {
    let folderId = selectedKeys.filter((key) => key.startsWith('folder_'))?.[0];

    if (!folderId && currentFile) {
      Object.values(fileTree).forEach((item) => {
        if (item.children?.includes(currentFile.id)) {
          folderId = item.data.id;
        }
      });
    }

    return folderId;
  }, [selectedKeys, fileTree, currentFile]);

  return { currentFolderId };
}
