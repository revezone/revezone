import { FileTree } from '@renderer/types/file';

export const getCurrentFolderId = (currentFileId: string, fileTree: FileTree) => {
  let currentFolderId;
  for (const folder of fileTree) {
    const file = folder.children.find((_file) => _file.id === currentFileId);
    if (file) {
      currentFolderId = folder.id;
      break;
    }
  }
  return currentFolderId;
};
