import type { Page } from '@revesuite/store';
import { Workspace } from '@revesuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@revesuite/editor';
import { blocksuiteStorage } from '../../store/blocksuite';

const CUSTOM_ELEMENT_NAME = 'revezone-block-suite-editor';

interface Props {
  pageId: string;
  onLinkOpen: (href: string) => void;
}
export default class RevezoneBlockSuiteEditor extends LitElement {
  readonly workspace: Workspace = blocksuiteStorage.workspace;
  readonly page: Page | null = null;
  readonly onLinkOpen: (href: string) => void;

  constructor({ pageId, onLinkOpen }: Props) {
    super();

    const page = this.workspace.getPage(pageId);

    this.onLinkOpen = onLinkOpen;

    console.log('--- page ---', page);

    if (!page) return;

    this.page = page;

    this.eventListener();

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

  async eventListener() {
    this.page?.slots.onYEvent.on((event) => {
      console.log('--- onYEvent ---', event);
    });

    this.page?.slots.linkClicked.on((href) => {
      console.log('--- linkClick ---', href);
      setTimeout(() => {
        this.onLinkOpen(href);
      }, 100);
    });
  }
}

customElements.define(CUSTOM_ELEMENT_NAME, RevezoneBlockSuiteEditor);
