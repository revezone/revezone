import { Workspace } from '@blocksuite/store';
import { createIndexedDBProvider } from '@toeverything/y-indexeddb';

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;
    this.connect2indexeddb();
  }

  workspace = new Workspace({
    id: 'revenote-workspace'
  });

  static instance: BlocksuiteStorage;

  connect2indexeddb = async (): Promise<void> => {
    const persistence = createIndexedDBProvider(this.workspace.doc);
    persistence.connect();
    await persistence.whenSynced.then(() => {
      persistence.disconnect();
    });
  };
}

export const blocksuiteStorage = new BlocksuiteStorage();
