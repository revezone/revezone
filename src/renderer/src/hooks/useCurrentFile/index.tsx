import { currentFileAtom, selectedKeysAtom } from '@renderer/store/jotai';
import { setCurrentFileToLocal, setSelectedKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';

export default function useCurrentFile() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);

  const updateCurrentFile = useCallback(async (fileId: string | undefined) => {
    const keys = fileId ? [fileId] : [];
    setSelectedKeys(keys);
    setSelectedKeysToLocal(keys);

    const file = fileId ? await menuIndexeddbStorage.getFile(fileId) : undefined;
    setCurrentFileToLocal(file);
    setCurrentFile(file);

    return file;
  }, []);

  return { currentFile, selectedKeys, updateCurrentFile, setCurrentFile };
}
