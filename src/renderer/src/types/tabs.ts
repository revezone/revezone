import { RevezoneFile } from './file';

export type TabItemType = 'tab';

export interface TabItem {
  id: string;
  type: TabItemType;
  name: string;
  config?: RevezoneFile;
}
