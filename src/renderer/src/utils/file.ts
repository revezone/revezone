import { DOUBLE_LINK_REGEX } from './constant';
import { RevezoneFolder, RevezoneFile, RevezoneFileTree, RevezoneFileType } from '../types/file';

const REVEZONE_LINK_PROTOCOL = 'revezone://';
const FILE_NAME_REGEX = /^(.+)(\.[a-zA-Z0-9]+)$/;

let timeout;

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

export function getUniqueNameInSameTreeLevel(
  item: RevezoneFile | RevezoneFolder,
  fileTree: RevezoneFileTree,
  parentId = 'root'
) {
  const parent = fileTree[parentId];
  const itemNamesInSameTreeLevel = parent.children
    ?.filter((id) => id !== item.id)
    ?.map((id) => fileTree[id].data.name);

  const isRepeated = !!itemNamesInSameTreeLevel?.find((name) => name === item.name);

  let maxRepeatIndex = 0;

  const repeatIndexRegx = new RegExp(`^${item.name}\\(([0-9]+)\\)$`);

  if (isRepeated) {
    itemNamesInSameTreeLevel?.forEach((name) => {
      const repeatIndex = name.match(repeatIndexRegx)?.[1];

      if (repeatIndex) {
        maxRepeatIndex =
          maxRepeatIndex > Number(repeatIndex) ? maxRepeatIndex : Number(repeatIndex);
      }
    });

    return `${item.name}(${maxRepeatIndex + 1})`;
  }

  return item.name;
}

export const sendFileDataChangeToMainDebounceFn = (
  id: string,
  data: string,
  fileTree: RevezoneFileTree
) => {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  // debounce
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('filechange debounce', id);
    window.api?.fileDataChange(id, data, fileTree);
  }, 1000);
};

export function getFilenameFromPath(path: string) {
  // 先使用对应操作系统的分隔符切割路径
  const parts = path.split(/[/\\]/);
  // 取最后一个部分作为文件名
  const filename = parts.pop();
  return filename;
}

export function getFileNameWithoutSuffix(filename: string) {
  const lastDotIdx = filename.lastIndexOf('.');
  if (lastDotIdx === -1 || lastDotIdx === 0) {
    // 如果文件名没有扩展名或者以 . 开头，则直接返回原文件名
    return filename;
  } else {
    // 否则截取文件名和扩展名之间的部分
    return filename.slice(0, lastDotIdx)?.replace('.', '-');
  }
}

export function getFileSuffix(filename: string): string {
  const lastDotIdx = filename.lastIndexOf('.');
  if (lastDotIdx === -1 || lastDotIdx === 0) {
    // 如果文件名没有扩展名或者以 . 开头，则直接返回原文件名
    return '';
  } else {
    // 否则截取文件名和扩展名之间的部分
    return filename.slice(lastDotIdx);
  }
}

export function getFileTypeFromSuffix(suffix: string): RevezoneFileType | undefined {
  switch (suffix) {
    case '.excalidraw':
      return 'board';
    case '.tldr':
      return 'tldraw';
    default:
      return suffix?.split('.').pop() as RevezoneFileType;
  }
}
