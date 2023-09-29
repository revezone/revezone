import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useAddFile from '@renderer/hooks/useAddFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import useFileTree from '@renderer/hooks/useFileTree';

const FILE_NAME_REGEX = /^(.+)(\.[a-zA-Z0-9]+)$/;

export default function ImportFiles() {
  const { t } = useTranslation();
  const { addFile } = useAddFile();
  const { model: tabModel } = useTabJsonModel();
  const { fileTree } = useFileTree();

  const importFile = useCallback(async (fileHandle) => {
    const localFile = await fileHandle.getFile();

    const fileData = await localFile.text();

    const matches = localFile.name.match(FILE_NAME_REGEX);
    const fileName = matches?.[1];
    const fileSuffix = matches?.[2];

    switch (fileSuffix) {
      case '.excalidraw':
        await addFile(fileName, 'board', tabModel, 'root', fileData);
        break;
      case '.tldr':
        await addFile(fileName, 'tldraw', tabModel, 'root', fileData);
        break;
    }
  }, []);

  const onClick = useCallback(async () => {
    // @ts-ignore
    const fileHandles = await window.showOpenFilePicker({ multiple: true });

    for await (const fileHandle of fileHandles) {
      await importFile(fileHandle);
    }
  }, [fileTree, tabModel]);

  return <div onClick={onClick}>{t('operation.import')}</div>;
}
