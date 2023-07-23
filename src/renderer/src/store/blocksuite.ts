import { Workspace, Text, createIndexeddbStorage, createMemoryStorage } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import { emitter, events } from './eventemitter';

const REVENOTE_EDITOR_KEY = 'revenote_blocksuite';

/**
 * the hack method to update blocksuite editor title dom
 * fix the problem that not rerender after rename page block's title prop
 * @param title string
 */
const hackUpdateTitleDom = (title) => {
  const titleDom = document
    .querySelector('.affine-default-page-block-title ')
    ?.querySelector('span[data-virgo-text]');

  if (titleDom) {
    titleDom.innerHTML = title;
  }
};

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
    console.log('--- connect ---');

    const indexeddbPersistence = new IndexeddbPersistence(REVENOTE_EDITOR_KEY, this.workspace.doc);

    this.indexeddbPersistence = indexeddbPersistence;

    // @ts-ignore
    window.persistence = indexeddbPersistence;

    indexeddbPersistence.on('synced', async () => {
      console.log('content from the database is loaded');
      emitter.emit(events.WORKSPACE_LOADED);
    });
  }

  async updatePageTitle(title: string, pageId: string) {
    const page = await this.workspace.getPage(pageId);
    const block = await page?.getBlockByFlavour('affine:page')?.[0];

    if (!block) {
      return;
    }

    page?.updateBlock(block, { title: new Text(title) });

    hackUpdateTitleDom(title);
  }

  async deletePage(pageId: string) {
    await this.workspace.removePage(pageId);
  }
}

export const blocksuiteStorage = new BlocksuiteStorage();
