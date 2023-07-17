import { Workspace, Text } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/models';
import { IndexeddbPersistence } from 'y-indexeddb';
import { emitter, events } from './eventemitter';

const REVENOTE_EDITOR_KEY = 'revenote-editor-indexeddb';

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;

    this.initYIndexeddb();
  }

  static instance: BlocksuiteStorage;
  workspace: Workspace = new Workspace({ id: REVENOTE_EDITOR_KEY }).register(AffineSchemas);
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

    console.log('--- update title ---', title);

    // emitter.emit(events.FORCE_UPDATE_EDITOR);
  }

  async deletePage(pageId: string) {
    await this.workspace.removePage(pageId);
  }
}

export const blocksuiteStorage = new BlocksuiteStorage();
