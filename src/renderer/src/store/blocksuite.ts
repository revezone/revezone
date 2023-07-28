import { Workspace, Text, createIndexeddbStorage, createMemoryStorage } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import { emitter, events } from './eventemitter';
import { hackUpdateTitleDom } from '@renderer/utils/dom';

const REVENOTE_EDITOR_KEY = 'revenote_blocksuite';

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
    id: REVENOTE_EDITOR_KEY,
    blobStorages: [createIndexeddbStorage, createMemoryStorage]
  }).register(AffineSchemas);
  indexeddbPersistence;

  async initYIndexeddb() {
    const indexeddbPersistence = new IndexeddbPersistence(REVENOTE_EDITOR_KEY, this.workspace.doc);

    this.indexeddbPersistence = indexeddbPersistence;

    // @ts-ignore
    window.persistence = indexeddbPersistence;

    indexeddbPersistence.on('synced', async () => {
      console.log('content from the database is loaded');
      emitter.emit(events.WORKSPACE_LOADED);
    });
  }

  async updatePageTitle(pageId: string, title: string) {
    const page = await this.workspace.getPage(pageId);
    const block = await page?.getBlockByFlavour('affine:page')?.[0];

    if (!block) {
      return;
    }

    if (page) {
      page.updateBlock(block, { title: new Text(title) });
      page.workspace.setPageMeta(page.id, { title });
      hackUpdateTitleDom(title);
    }
  }

  async deletePage(pageId: string) {
    await this.workspace.removePage(pageId);
  }
}

export const blocksuiteStorage = new BlocksuiteStorage();
