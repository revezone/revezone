import { TabItem } from '@renderer/types/tabs';

export const DOUBLE_LINK_REGEX = /^\[\[(.+)\]\]$/;
export const DEFAULT_LANG_CODE = 'en';
export const DEFAULT_EMPTY_TAB_ID = 'new_tab';
export const DEFAULT_TAB_LIST: TabItem[] = [
  { id: DEFAULT_EMPTY_TAB_ID, name: 'New Tab', type: 'tab', fileType: 'empty' }
];
