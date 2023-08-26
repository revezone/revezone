import { useCallback } from 'react';
import { getOpenKeysFromLocal, setOpenKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { openKeysAtom } from '@renderer/store/jotai';

export default function useOpenKeys() {
  const [openKeys, setOpenKeys] = useAtom(openKeysAtom);

  const addOpenKeys = useCallback((keys: string[]) => {
    const openKeys = getOpenKeysFromLocal();

    let notChanged = true;

    keys.forEach((key) => {
      if (!openKeys.includes(key)) {
        notChanged = false;
      }
    });

    if (notChanged) return;

    const newKeys = [...openKeys, ...keys].filter((item) => !!item);

    console.log('--- onExpandItem ---', newKeys);

    setOpenKeys(newKeys);
    setOpenKeysToLocal(newKeys);
  }, []);

  const removeOpenKey = useCallback((key: string) => {
    const openKeys = getOpenKeysFromLocal();
    const keys = openKeys.filter((_key) => _key !== key);

    console.log('--- onCollapseItem ---', keys);

    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  return { openKeys, setOpenKeys, addOpenKeys, removeOpenKey };
}
