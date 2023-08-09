import { Workspace, createIndexeddbStorage, createMemoryStorage } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import { emitter, events } from './eventemitter';

console.log('AffineSchemas', AffineSchemas);

const REVEZONE_EDITOR_KEY = 'revezone_blocksuite';

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;

    this.initYIndexeddb();
  }

  static instance: BlocksuiteStorage;
  workspace: Workspace = new Workspace({
    id: REVEZONE_EDITOR_KEY,
    blobStorages: [createIndexeddbStorage, createMemoryStorage]
  }).register(AffineSchemas);
  indexeddbPersistence;

  async initYIndexeddb() {
    const indexeddbPersistence = new IndexeddbPersistence(REVEZONE_EDITOR_KEY, this.workspace.doc);

    this.indexeddbPersistence = indexeddbPersistence;

    // @ts-ignore
    window.persistence = indexeddbPersistence;

    indexeddbPersistence.on('synced', async () => {
      console.log('content from the database is loaded');
      emitter.emit(events.WORKSPACE_LOADED);
    });
  }

  async addPage(pageId: string) {
    return await this.workspace.createPage({ id: pageId, init: true });
  }

  async deletePage(pageId: string) {
    await this.workspace.removePage(pageId);
  }

  // TODO: FIGURE OUT THE API OF COPY PAGE IN BLOCKSUITE
  async copyPage(pageId: string, copyPageId: string, title: string) {
    // const copyPage = await this.workspace.getPage(copyPageId);
    // const newPage = await this.workspace.createPage({
    //   id: pageId,
    //   init: { title }
    // });
  }
}

export const blocksuiteStorage = new BlocksuiteStorage();
