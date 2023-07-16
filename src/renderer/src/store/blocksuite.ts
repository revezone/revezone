import { Workspace } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';

const REVENOTE_EDITOR_KEY = 'revenote-editor-indexeddb';

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;
  }

  workspace = new Workspace({ id: REVENOTE_EDITOR_KEY }).register(AffineSchemas);
  static instance: BlocksuiteStorage;
}

export const blocksuiteStorage = new BlocksuiteStorage();
