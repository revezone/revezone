import type { Page } from '@revesuite/store';
import { Workspace } from '@revesuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@revesuite/editor';
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

    console.log('--- page ---', page);

    if (!page) return;

    this.page = page;

    // @ts-ignore
    window.workspace = this.workspace;

    // @ts-ignore
    window.page = page;

    // @ts-ignore
    window.editor = this;
  }

  override connectedCallback(): void {
    const editor = new EditorContainer();

    if (!this.page) return;

    console.log('--- connectedCallback ---', this);

    editor.page = this.page;
    this.appendChild(editor);
  }

  override disconnectedCallback(): void {
    console.log('--- disconnectedCallback ---', this.children[0]);

    this.removeChild(this.children[0]);
  }
}

customElements.define(CUSTOM_ELEMENT_NAME, RevezoneBlockSuiteEditor);
