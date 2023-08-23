import { currentFileAtom, selectedKeysAtom, focusItemAtom } from '@renderer/store/jotai';
import { setCurrentFileToLocal, setSelectedKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';

export default function useCurrentFile() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [focusItem, setFocusItem] = useAtom(focusItemAtom);

  const updateCurrentFile = useCallback(async (fileId: string | undefined) => {
    const keys = fileId ? [fileId] : [];
    setSelectedKeys(keys);
    setSelectedKeysToLocal(keys);

    const file = fileId ? await fileTreeIndexeddbStorage.getFile(fileId) : undefined;
    setCurrentFileToLocal(file);
    setCurrentFile(file);

    setFocusItem(file?.id || '');

    return file;
  }, []);

  return { currentFile, selectedKeys, updateCurrentFile, setCurrentFile };
}
