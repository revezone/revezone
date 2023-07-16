import { AffineSchemas } from '@blocksuite/blocks/models';
import type { Page } from '@blocksuite/store';
import { Workspace } from '@blocksuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@blocksuite/editor';
import { IndexeddbPersistence } from 'y-indexeddb';

const REVENOTE_EDITOR_KEY = 'revenote-editor';

export default class RevenoteBlockSuiteEditor extends LitElement {
  static workspace: Workspace;
  readonly page: Page;

  constructor() {
    super();

    RevenoteBlockSuiteEditor.workspace = new Workspace({ id: REVENOTE_EDITOR_KEY }).register(
      AffineSchemas
    );
    this.page = RevenoteBlockSuiteEditor.workspace.createPage({ init: true });

    this.init();
  }

  async init() {
    const { doc } = RevenoteBlockSuiteEditor.workspace;

    const provider = new IndexeddbPersistence(REVENOTE_EDITOR_KEY, doc);

    console.log('--- provider ---', provider);

    provider.on('synced', () => {
      console.log('content from the database is loaded');
    });
  }

  override connectedCallback(): void {
    const editor = new EditorContainer();
    editor.page = this.page;
    this.appendChild(editor);
  }

  override disconnectedCallback(): void {
    this.removeChild(this.children[0]);
  }
}

customElements.define('revenote-block-suite-editor', RevenoteBlockSuiteEditor);
