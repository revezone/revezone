import fs from 'node:fs';
import { ensureDir } from './io';
import { getUserFilesStoragePath } from './customStoragePath';
import {
  RevezoneFileTree,
  RevezoneFolder,
  RevezoneFile,
  RevezoneFileType
} from '../../renderer/src/types/file';
import path, { join } from 'node:path';
import { TreeItem } from 'react-complex-tree';
import { getUniqueNameInSameTreeLevel } from '../../renderer/src/utils/file';

interface FullPathInfo {
  type: 'folder' | 'file';
  fileType?: RevezoneFileType;
  suffix?: '.excalidraw' | '.md';
  path: string;
  parentDirPath: string;
}

export function getFileSuffix(fileType: string | undefined) {
  switch (fileType) {
    case 'board':
      return '.excalidraw';
    case 'note':
      return '.md';
  }

  return undefined;
}

/**
 * ATTENTION: Files's name cannot be same in one directory
 * @param fileId
 * @param fileTree
 * @param filePath
 */
export const getParentPathInFileTree = (
  itemId: string,
  fileTree: RevezoneFileTree,
  filePath = ''
) => {
  let parentItem;

  const items = Object.values(fileTree);

  items.forEach((treeItem: TreeItem) => {
    if (treeItem.children?.includes(itemId)) {
      parentItem = treeItem.data;
    }
  });

  if (parentItem) {
    // @ts-ignore
    filePath = getParentPathInFileTree(parentItem.id, fileTree, `${parentItem.name}/${filePath}`);
  }

  return filePath;
};

export function getFullPathInfo(itemId: string, fileTree: RevezoneFileTree): FullPathInfo {
  const item = fileTree[itemId].data;

  const userFilesStoragePath = getUserFilesStoragePath();

  const parentPathInFileTree = getParentPathInFileTree(itemId, fileTree);

  console.log('--- parentPathInFileTree ---', parentPathInFileTree);

  const parentDirPath = join(userFilesStoragePath, parentPathInFileTree);

  if (item.id.startsWith('folder_')) {
    const folderFullPath = path.join(parentDirPath, item.name);

    return {
      type: 'folder',
      path: folderFullPath,
      parentDirPath
    };
  } else {
    const suffix = getFileSuffix(item.type);
    const fullFilePath = path.join(parentDirPath, `${item.name}${suffix}`);

    return {
      type: 'file',
      fileType: item.type as 'note' | 'board',
      suffix,
      path: fullFilePath,
      parentDirPath
    };
  }
}

export function addOrUpdateFile(
  fileId: string,
  value: string,
  fileTree: RevezoneFileTree,
  type: 'add' | 'update'
) {
  const { path: fullFilePath, parentDirPath } = getFullPathInfo(fileId, fileTree);

  console.log('--- addOrUpdateFile ---', fullFilePath, type);

  if (type === 'update' && !fs.existsSync(fullFilePath)) {
    return;
  }

  ensureDir(parentDirPath);

  fs.writeFileSync(fullFilePath, value);
}

export function onAddFile(fileId: string, value: string, fileTree: RevezoneFileTree) {
  console.log('--- onAddFile ---', fileId, value, fileTree);
  addOrUpdateFile(fileId, value, fileTree, 'add');
}

export function onFileDataChange(fileId: string, value: string, fileTree: RevezoneFileTree) {
  addOrUpdateFile(fileId, value, fileTree, 'update');
}

export function onRenameFileOrFolder(itemId: string, newName: string, fileTree: RevezoneFileTree) {
  const { path: fullFilePath, parentDirPath, suffix } = getFullPathInfo(itemId, fileTree);

  fs.renameSync(fullFilePath, `${parentDirPath}/${newName}${suffix}`);
}

export function onDeleteFileOrFolder(
  item: RevezoneFile | RevezoneFolder,
  fileTree: RevezoneFileTree
) {
  console.log('--- delete ---', item);

  const { path: fullFilePath } = getFullPathInfo(item.id, fileTree);

  if (item.id.startsWith('folder_')) {
    console.log('--- delete folder ---', fullFilePath);

    fs.rmdirSync(fullFilePath);
  } else {
    console.log('--- delete file path ---', fullFilePath);

    fs.rmSync(fullFilePath);
  }
}

export function moveFileOrFolder(
  item: RevezoneFile | RevezoneFolder,
  parentId: string,
  fileTree: RevezoneFileTree
) {
  const { path: sourcePath } = getFullPathInfo(item.id, fileTree);
  const { path: parentPath } = getFullPathInfo(parentId, fileTree);

  const uniqueName = getUniqueNameInSameTreeLevel(item, fileTree);

  console.log('--- uniqueName ---', item.name, uniqueName);

  let destPath = join(parentPath, uniqueName);

  if (item.id.startsWith('file_')) {
    destPath = `${destPath}${getFileSuffix(item.type)}`;
  }

  console.log('--- moveFileOrFolder ---', sourcePath, destPath);

  if (sourcePath !== destPath) {
    fs.renameSync(sourcePath, destPath);
  }
}

export function onDragAndDrop(
  items: TreeItem<RevezoneFile | RevezoneFolder>[],
  parentId: string,
  fileTree: RevezoneFileTree
) {
  items.forEach((item) => {
    moveFileOrFolder(item.data, parentId, fileTree);
  });
}
