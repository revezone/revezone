import type { Page } from '@blocksuite/store';
import { Workspace } from '@blocksuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@blocksuite/editor';
import { blocksuiteStorage } from '../../store/blocksuite';

interface Props {
  pageId: string;
}
export default class RevenoteBlockSuiteEditor extends LitElement {
  readonly workspace: Workspace = blocksuiteStorage.workspace;
  readonly page: Page;

  constructor({ pageId }: Props) {
    super();

    console.log('--- pageId ---', pageId);

    console.log('--- get page ---', this.workspace.getPage(pageId));

    this.page =
      this.workspace.getPage(pageId) || this.workspace.createPage({ id: pageId, init: true });

    console.log('--- this.page ---', this.page);

    // @ts-ignore
    window.workspace = RevenoteBlockSuiteEditor.workspace;

    // @ts-ignore
    window.editor = this;

    // this.init();
  }

  // async init() {
  //   const { doc } = RevenoteBlockSuiteEditor.workspace;

  //   const provider = new IndexeddbPersistence(REVENOTE_EDITOR_KEY, doc);

  //   console.log('--- provider ---', provider);

  //   provider.on('synced', () => {
  //     console.log('content from the database is loaded');
  //   });
  // }

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
