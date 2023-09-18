import fs from 'node:fs';
import { ensureDir } from './io';
import { getUserFilesStoragePath } from './customStoragePath';
import {
  RevezoneFileTree,
  RevezoneFolder,
  RevezoneFile,
  RevezoneFileType
} from '../../renderer/src/types/file';
import { join } from 'node:path';
import { TreeItem } from 'react-complex-tree';
import { getUniqueNameInSameTreeLevel } from '../../renderer/src/utils/file';

type RevezoneFileSuffix = '.excalidraw' | '.tldraw' | '.md';

interface FullPathInfo {
  type: 'folder' | 'file';
  fileType?: RevezoneFileType;
  suffix?: RevezoneFileSuffix;
  path: string;
  parentDirPath: string;
}

export function getFileSuffix(fileType: string | undefined): RevezoneFileSuffix | undefined {
  switch (fileType) {
    case 'board':
      return '.excalidraw';
    case 'note':
      return '.md';
    case 'tldraw':
      return '.tldraw';
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
      parentItem = treeItem?.data;
    }
  });

  if (parentItem) {
    let _filePath;
    // @ts-ignore
    if (parentItem.id === 'root') {
      _filePath = filePath;
    } else {
      // @ts-ignore
      _filePath = join(parentItem.name, filePath);
    }
    // @ts-ignore
    filePath = getParentPathInFileTree(parentItem.id, fileTree, _filePath);
  }

  return filePath;
};

export function getFullPathInfo(itemId: string, fileTree: RevezoneFileTree): FullPathInfo {
  const item = fileTree[itemId]?.data;

  const userFilesStoragePath = getUserFilesStoragePath();

  if (!item) {
    console.log('--- getFullPathInfo ---', itemId, fileTree);
    throw new Error(`getFullPathInfo: File item ${itemId} not found`);
  }

  const parentPathInFileTree = getParentPathInFileTree(itemId, fileTree);

  const parentDirPath = join(userFilesStoragePath, parentPathInFileTree);

  if (item.id.startsWith('folder_')) {
    const folderFullPath = join(parentDirPath, item.name);

    return {
      type: 'folder',
      path: folderFullPath,
      parentDirPath
    };
  } else {
    const suffix = getFileSuffix(item.type);
    const fullFilePath = join(parentDirPath, `${item.name}${suffix}`);

    return {
      type: 'file',
      fileType: item.type as RevezoneFileType,
      suffix,
      path: fullFilePath,
      parentDirPath
    };
  }
}

export function addOrUpdateFile(fileId: string, value: string, fileTree: RevezoneFileTree) {
  const { path: fullFilePath, parentDirPath } = getFullPathInfo(fileId, fileTree);

  ensureDir(parentDirPath);

  console.log('--- addOrUpdateFile ---', parentDirPath, fullFilePath);

  fs.writeFileSync(fullFilePath, value);
}

export function onAddFile(fileId: string, value: string, fileTree: RevezoneFileTree) {
  addOrUpdateFile(fileId, value, fileTree);
}

export function onFileDataChange(fileId: string, value: string, fileTree: RevezoneFileTree) {
  addOrUpdateFile(fileId, value, fileTree);
}

export function onRenameFileOrFolder(itemId: string, newName: string, fileTree: RevezoneFileTree) {
  const { path: fullFilePath, parentDirPath, suffix } = getFullPathInfo(itemId, fileTree);

  fs.renameSync(fullFilePath, join(parentDirPath, `${newName}${suffix}`));
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
