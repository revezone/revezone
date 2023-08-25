import { currentFileAtom, selectedKeysAtom, focusItemAtom } from '@renderer/store/jotai';
import { setCurrentFileToLocal, setSelectedKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { RevezoneFile } from '@renderer/types/file';

export default function useCurrentFile() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [, setFocusItem] = useAtom(focusItemAtom);

  const updateCurrentFile = useCallback(async (fileInfo: RevezoneFile | undefined) => {
    const fileId = fileInfo?.id;
    const keys = fileId ? [fileId] : [];
    setSelectedKeys(keys);
    setSelectedKeysToLocal(keys);

    setCurrentFileToLocal(fileInfo);
    setCurrentFile(fileInfo);

    console.log('--- setCurrentFile ---', fileId, fileInfo);

    setFocusItem(fileId || '');

    return fileInfo;
  }, []);

  return { currentFile, selectedKeys, updateCurrentFile, setCurrentFile };
}
