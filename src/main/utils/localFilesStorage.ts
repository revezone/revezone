import fs from 'node:fs';
import { ensureDir } from './io';
import { getUserFilesStoragePath } from './customStoragePath';
import { RevezoneFileTree } from '../../renderer/src/types/file';
import { join } from 'node:path';
import { TreeItem } from 'react-complex-tree';

/**
 * ATTENTION: Files's name cannot be same in one directory
 * @param fileId
 * @param fileTree
 * @param filePath
 */
export const getFilePath = (itemId: string, fileTree: RevezoneFileTree, filePath = '') => {
  let parentItem;

  const items = Object.values(fileTree);

  items.forEach((treeItem: TreeItem) => {
    if (treeItem.children?.includes(itemId)) {
      parentItem = treeItem.data;
    }
  });

  // @ts-ignore
  filePath = parentItem?.id
    ? // @ts-ignore
      getFilePath(parentItem.id, fileTree, filePath)
    : // @ts-ignore
      `${parentItem.name}/${filePath}`;

  return filePath ? `${filePath}/` : '';
};

export function onFileDataChange(fileId: string, value: string, fileTree: RevezoneFileTree) {
  const file = fileTree[fileId].data;

  const userFilesStoragePath = getUserFilesStoragePath();

  console.log('--- fileDataChange ---', fileId, file, userFilesStoragePath);

  const filePathInFileTree = getFilePath(fileId, fileTree);

  const fileDir = join(userFilesStoragePath, filePathInFileTree);

  ensureDir(fileDir);

  const suffix = file.type === 'board' ? '.excalidraw' : '.md';
  const fullFilePath = `${fileDir}/${file.name}${suffix}`;

  fs.writeFileSync(fullFilePath, value);
}
