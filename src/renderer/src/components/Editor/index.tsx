import { useEffect, useRef } from 'react';
import "@blocksuite/editor";
import "@blocksuite/editor/themes/affine.css";



import { AffineSchemas } from '@blocksuite/blocks/models';
import type { Page } from '@blocksuite/store';
import { Workspace } from '@blocksuite/store';
import { LitElement } from 'lit';
import { EditorContainer } from '@blocksuite/editor';

import './index.css';

export class SimpleAffineEditor extends LitElement {
  readonly workspace: Workspace;
  readonly page: Page;

  constructor() {
    super();

    this.workspace = new Workspace({ id: 'foo' }).register(AffineSchemas);
    this.page = this.workspace.createPage({ init: true });
  }

  override connectedCallback() {
    const editor = new EditorContainer();
    editor.page = this.page;
    this.appendChild(editor);
  }

  override disconnectedCallback() {
    this.removeChild(this.children[0]);
  }
}


function Editor() {

  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!editorMountRef.current) {
      editorMountRef.current = true;

      const editor = document.createElement("simple-affine-editor");
      // const editor = new SimpleAffineEditor
      editorRef.current?.appendChild(editor);

      // @ts-ignore
      window.editor = editor;

      editor.page.slots.historyUpdated.on((history) => {

        console.log('--- history ---', history);

        const jsx = editor.workspace.exportJSX();
        const snapshot = editor.workspace.exportSnapshot();

        console.log('--- jsx ---', jsx);
        console.log('--- snapshot ---', snapshot);
      })

    }

  }, []);

  return <div className='blocksuite-editor-container' ref={editorRef}></div>;
}

export default Editor