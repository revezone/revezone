import { useEffect, useRef } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';

import './index.css';

function MarkdownEditor(): JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!editorMountRef.current) {
      editorMountRef.current = true;

      // const editor = document.createElement('revenote-block-suite-editor');
      const editor = new RevenoteBlockSuiteEditor();
      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;

      editor.page.slots.historyUpdated.on((history) => {
        console.log('--- history ---', history);

        const jsx = RevenoteBlockSuiteEditor.workspace.exportJSX();
        const snapshot = RevenoteBlockSuiteEditor.workspace.exportSnapshot();

        console.log('--- jsx ---', jsx);
        console.log('--- snapshot ---', snapshot);
      });
    }
  }, []);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default MarkdownEditor;
