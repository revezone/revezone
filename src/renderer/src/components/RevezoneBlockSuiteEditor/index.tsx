import type { Page } from '@blocksuite/store';
import { Workspace } from '@blocksuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@blocksuite/editor';
import { blocksuiteStorage } from '../../store/blocksuite';

const CUSTOM_ELEMENT_NAME = 'revezone-block-suite-editor';

interface Props {
  pageId: string;
}
export default class RevezoneBlockSuiteEditor extends LitElement {
  readonly workspace: Workspace = blocksuiteStorage.workspace;
  readonly page: Page | null = null;

  constructor({ pageId }: Props) {
    super();

    const page = this.workspace.getPage(pageId);

    if (!page) return;

    this.page = page;

    // @ts-ignore
    window.workspace = RevezoneBlockSuiteEditor.workspace;

    // @ts-ignore
    window.editor = this;
  }

  override connectedCallback(): void {
    const editor = new EditorContainer();

    if (!this.page) return;

    editor.page = this.page;
    this.appendChild(editor);
  }

  override disconnectedCallback(): void {
    this.removeChild(this.children[0]);
  }
}

customElements.define(CUSTOM_ELEMENT_NAME, RevezoneBlockSuiteEditor);
