import { RevezoneFile } from './file';

export type TabItemType = 'tab';

export interface TabItem {
  id: string;
  type: TabItemType;
  fileType: 'note' | 'board';
  name: string;
  config: RevezoneFile;
}
