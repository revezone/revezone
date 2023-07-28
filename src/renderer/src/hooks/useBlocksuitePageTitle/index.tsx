import { blocksuiteStorage } from '@renderer/store/blocksuite';
import { currentFileIdAtom, workspaceLoadedAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { useDebounceEffect } from 'ahooks';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';

export default function useBlocksuitePageTitle() {
  const [currentFileId] = useAtom(currentFileIdAtom);
  const [workspaceLoaded] = useAtom(workspaceLoadedAtom);

  const [pageTitle, setPageTitle] = useState<string>();

  const pageTitleUpdateListener = useCallback(async () => {
    if (!currentFileId || !workspaceLoaded) {
      return;
    }

    const page = await blocksuiteStorage.workspace.getPage(currentFileId);
    const prevTitle = page?.meta.title;

    page?.slots.historyUpdated.on(async () => {
      const currentTitle = page.meta.title;
      if (currentTitle !== prevTitle) {
        setPageTitle(currentTitle);
        const file = await menuIndexeddbStorage.getFile(currentFileId);
        file && menuIndexeddbStorage.updateFileName(file, currentTitle);
      }
    });
  }, [currentFileId, workspaceLoaded]);

  const getPageTitle = useCallback(async () => {
    if (!currentFileId) return;
    const page = await blocksuiteStorage.workspace.getPage(currentFileId);

    setPageTitle(page?.meta.title);
  }, [currentFileId]);

  useDebounceEffect(
    () => {
      getPageTitle();
      pageTitleUpdateListener();
    },
    [currentFileId, workspaceLoaded],
    { wait: 200 }
  );

  return [pageTitle];
}
