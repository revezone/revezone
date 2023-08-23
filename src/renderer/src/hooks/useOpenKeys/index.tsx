import { useCallback } from 'react';
import { getOpenKeysFromLocal, setOpenKeysToLocal } from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { openKeysAtom } from '@renderer/store/jotai';

export default function useOpenKeys() {
  const [openKeys, setOpenKeys] = useAtom(openKeysAtom);

  const addOpenKey = useCallback((key) => {
    const openKeys = getOpenKeysFromLocal();
    const keys = [...openKeys, key].filter((item) => !!item);

    console.log('--- onExpandItem ---', keys);

    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  const removeOpenKey = useCallback((key) => {
    const openKeys = getOpenKeysFromLocal();
    const keys = openKeys.filter((_key) => _key !== key);

    console.log('--- onCollapseItem ---', keys);

    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  return { openKeys, setOpenKeys, addOpenKey, removeOpenKey };
}
