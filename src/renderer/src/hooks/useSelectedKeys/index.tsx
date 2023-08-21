import { currentFileAtom, selectedKeysAtom } from '@renderer/store/jotai';
import { setCurrentFileToLocal, setSelectedKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';

export default function useSelectedKeys() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);

  const updateSelectedKeys = useCallback(async (fileId: string) => {
    const keys = fileId ? [fileId] : [];
    setSelectedKeys(keys);
    setSelectedKeysToLocal(keys);

    const file = await menuIndexeddbStorage.getFile(fileId);
    setCurrentFileToLocal(file);
    setCurrentFile(file);
  }, []);

  return { selectedKeys, updateSelectedKeys };
}
