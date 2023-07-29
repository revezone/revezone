import { Workspace, Text, createIndexeddbStorage, createMemoryStorage } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import { emitter, events } from './eventemitter';
import { hackUpdateTitleDom } from '@renderer/utils/dom';

console.log('AffineSchemas', AffineSchemas);

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
