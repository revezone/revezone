import { DOUBLE_LINK_REGEX } from './constant';
import { RevezoneFolder, RevezoneFile, RevezoneFileTree } from '../types/file';
import { debounce } from './debounce';

const REVEZONE_LINK_PROTOCOL = 'revezone://';

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

export const getFileDataChangeDebounceFn = () => {
  return debounce((id: string, data: string, fileTree: RevezoneFileTree) => {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }

    console.log('--- send fileDataChange ---', id, JSON.parse(data));
    window.api.fileDataChange(id, data, fileTree);
  }, 1000);
};
