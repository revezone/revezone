import { FileTree } from '@renderer/types/file';

export const getCurrentFolderIdByFileId = (currentFileId: string, fileTree: FileTree): string => {
  let currentFolderId;
  for (const folder of fileTree) {
    const file = folder.children.find((_file) => _file.id === currentFileId);
    if (file) {
      currentFolderId = folder.id;
      break;
    }
  }

  console.log('getCurrentFolderIdByFileId', currentFolderId, currentFileId, fileTree);

  return currentFolderId;
};
