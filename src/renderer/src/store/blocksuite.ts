import { Workspace } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

const REVENOTE_EDITOR_KEY = 'revenote-editor-indexeddb';
const REVENOTE_WORKSPACE_KEY = 'revenote-workspace';

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;

    this.workspace = new Workspace({ id: REVENOTE_EDITOR_KEY }).register(AffineSchemas);

    this.initYIndexeddb();
  }

  static instance: BlocksuiteStorage;
  workspace;
  indexeddbPersistence;

  async initYIndexeddb() {
    const { doc } = this.workspace;

    console.log('--- connect ---');

    const indexeddbPersistence = new IndexeddbPersistence(REVENOTE_EDITOR_KEY, doc);

    this.indexeddbPersistence = indexeddbPersistence;

    // const binary = await indexeddbPersistence.get(REVENOTE_WORKSPACE_KEY);

    // Y.applyUpdate(this.workspace.doc, binary);

    // @ts-ignore
    window.persistence = indexeddbPersistence;

    indexeddbPersistence.on('synced', (value) => {
      console.log('content from the database is loaded', value);
    });
  }

  //   async updateIndexeddbPersistence() {
  //     const binary = Y.encodeStateAsUpdate(this.workspace.doc);
  //     await this.indexeddbPersistence.set(REVENOTE_WORKSPACE_KEY, binary);
  //   }
}

export const blocksuiteStorage = new BlocksuiteStorage();
