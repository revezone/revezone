import { RevezoneFileTree } from '@renderer/types/file';
import { IJsonModel } from 'flexlayout-react';

export const DOUBLE_LINK_REGEX = /^\[\[(.+)\]\]$/;
export const DEFAULT_LANG_CODE = 'en';
export const DEFAULT_EMPTY_TAB_ID = 'new_tab';

export const WELCOME_TAB_ITEM = {
  id: 'welcome',
  name: 'Welcome Page',
  type: 'tab',
  config: {
    id: 'welcome',
    name: 'Welcome Page',
    type: 'welcome'
  }
};

export const FIRST_DEFAULT_BOARD = {
  id: 'file_0064e8fd-0305-49b3-a609-ea239c77d410',
  name: 'New Board',
  type: 'tab',
  config: {
    gmtCreate: 'Thu Aug 31 2023 21:24:50 GMT+0800',
    gmtModified: 'Thu Aug 31 2023 21:24:50 GMT+0800',
    id: 'file_d669b3da-5475-4691-899e-c7163a04a996',
    name: 'New Board',
    type: 'board'
  }
};

export const DEFAULT_TAB_JSON_MODEL: IJsonModel = {
  global: {
    tabEnableRename: false
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 10,
        selected: 0,
        children: [WELCOME_TAB_ITEM]
      }
    ]
  }
};

export const DEFAULT_FILE_TREE: RevezoneFileTree = {
  root: {
    index: 'root',
    data: {
      id: 'root',
      name: 'root',
      gmtCreate: 'Thu Aug 31 2023 23:10:19 GMT+0800',
      gmtModified: 'Thu Aug 31 2023 23:10:19 GMT+0800'
    },
    isFolder: true,
    canRename: true,
    children: []
  }
};
