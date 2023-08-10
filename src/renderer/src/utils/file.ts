import { FileTree, RevezoneFile } from '@renderer/types/file';

export const getFileById = (fileId: string, fileTree: FileTree) => {
  const files = fileTree.reduce(
    (prev: RevezoneFile[], current) => [...prev, ...current.children],
    []
  );

  const file = fileId ? files?.find((_file) => _file.id === fileId) : null;

  return file;
};

export const getFolderIdByFileId = (fileId: string, fileTree: FileTree): string => {
  let currentFolderId;
  for (const folder of fileTree) {
    const file = folder.children.find((_file) => _file.id === fileId);
    if (file) {
      currentFolderId = folder.id;
      break;
    }
  }

  return currentFolderId;
};
