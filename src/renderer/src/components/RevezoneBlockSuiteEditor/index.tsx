import type { Page } from '@revesuite/store';
import { Workspace } from '@revesuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@revesuite/editor';
import { blocksuiteStorage } from '../../store/blocksuite';
import { convertHtmlToMarkdown } from '@renderer/utils/markdown';

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

    editor.page = this.page;
    this.appendChild(editor);
  }

  override disconnectedCallback(): void {
    this.removeChild(this.children[0]);
  }

  async eventListener() {
    this.page?.slots.linkClicked.on((href) => {
      setTimeout(() => {
        this.onLinkOpen(href);
      }, 100);
    });

    // this.page?.slots.historyUpdated.on((...args) => {
    //   console.log('--- historyUpdated ---', this.page?.id, ...args);

    //   // if (!this.page?.root?.id) return;

    //   // const id = this.page.root.id;

    //   // const htmlContent = document.querySelector(`[data-block-id=${id}]`)?.innerHTML;
    //   // const markdown = htmlContent && convertHtmlToMarkdown(htmlContent);

    //   // console.log('--- markdown ---', markdown);
    // });
  }
}

customElements.define(CUSTOM_ELEMENT_NAME, RevezoneBlockSuiteEditor);
