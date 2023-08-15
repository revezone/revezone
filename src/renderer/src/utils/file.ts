import { FileTree, RevezoneFile } from '@renderer/types/file';

const REVEZONE_LINK_PROTOCOL = 'revezone://';
import { DOUBLE_LINK_REGEX } from '@renderer/utils/constant';

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

export const getFileIdOrNameFromLink = (link: string) => {
  if (link.startsWith(REVEZONE_LINK_PROTOCOL)) {
    // file id
    return link.split(REVEZONE_LINK_PROTOCOL)?.[1];
  } else if (DOUBLE_LINK_REGEX.test(link)) {
    // file name
    return link?.match(DOUBLE_LINK_REGEX)?.[1];
  }
  return null;
};
