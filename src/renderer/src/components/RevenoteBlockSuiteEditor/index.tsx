import type { Page } from '@blocksuite/store';
import { Workspace } from '@blocksuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@blocksuite/editor';
import { blocksuiteStorage } from '../../store/blocksuite';

const CUSTOM_ELEMENT_NAME = 'revenote-block-suite-editor';

interface Props {
  pageId: string;
}
export default class RevenoteBlockSuiteEditor extends LitElement {
  readonly workspace: Workspace = blocksuiteStorage.workspace;
  readonly page: Page;

  constructor({ pageId }: Props) {
    super();

    const pageExsited = this.workspace.getPage(pageId);

    this.page = pageExsited || this.workspace.createPage({ id: pageId, init: true });

    // @ts-ignore
    window.workspace = RevenoteBlockSuiteEditor.workspace;

    // @ts-ignore
    window.editor = this;
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

customElements.define(CUSTOM_ELEMENT_NAME, RevenoteBlockSuiteEditor);
