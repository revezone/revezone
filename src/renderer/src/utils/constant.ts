import { IJsonModel } from 'flexlayout-react';

export const DOUBLE_LINK_REGEX = /^\[\[(.+)\]\]$/;
export const DEFAULT_LANG_CODE = 'en';
export const DEFAULT_EMPTY_TAB_ID = 'new_tab';

export const WELCOME_TAB_ITEM = {
  id: 'welcome',
  name: 'welcome page',
  type: 'tab',
  config: {
    id: 'welcome',
    name: 'welcome page',
    type: 'welcome'
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
