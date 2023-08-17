const REVEZONE_LINK_PROTOCOL = 'revezone://';
import { DOUBLE_LINK_REGEX } from '@renderer/utils/constant';

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
