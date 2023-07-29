import { blocksuiteStorage } from '@renderer/store/blocksuite';
import { currentFileAtom, workspaceLoadedAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { useDebounceEffect } from 'ahooks';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';

export default function useBlocksuitePageTitle() {
  const [currentFile] = useAtom(currentFileAtom);
  const [workspaceLoaded] = useAtom(workspaceLoadedAtom);

  const [pageTitle, setPageTitle] = useState<string>();

  const pageUpdateListener = useCallback(async () => {
    if (!currentFile?.id || !workspaceLoaded) {
      return;
    }

    const page = await blocksuiteStorage.workspace.getPage(currentFile?.id);
    const prevTitle = page?.meta.title;

    page?.slots.historyUpdated.on(async () => {
      const file = await menuIndexeddbStorage.getFile(currentFile?.id);

      const currentTitle = page.meta.title;
      if (currentTitle !== prevTitle) {
        setPageTitle(currentTitle);

        file && menuIndexeddbStorage.updateFileName(file, currentTitle);
      } else {
        file && menuIndexeddbStorage.updateFileGmtModified(file);
      }
    });
  }, [currentFile?.id, workspaceLoaded]);

  const getPageTitle = useCallback(async () => {
    if (!currentFile?.id) return;
    const page = await blocksuiteStorage.workspace.getPage(currentFile?.id);

    setPageTitle(page?.meta.title);
  }, [currentFile?.id]);

  useDebounceEffect(
    () => {
      getPageTitle();
      pageUpdateListener();
    },
    [currentFile?.id, workspaceLoaded],
    { wait: 200 }
  );

  return [pageTitle];
}
