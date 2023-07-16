import { useEffect, useRef } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';
import { useAtom } from 'jotai';
import { currentFileIdAtom } from '@renderer/store/jotai';

import './index.css';

function MarkdownEditor(): JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);
  const [currentFileId] = useAtom(currentFileIdAtom);

  useEffect(() => {
    if (!editorMountRef.current) {
      editorMountRef.current = true;

      if (!currentFileId) {
        return;
      }

      console.log('currentFileId', currentFileId);

      const editor = new RevenoteBlockSuiteEditor({ pageId: currentFileId });
      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;

      // editor.page.slots.historyUpdated.on((history) => {
      //   console.log('--- history ---', history);

      //   const jsx = editor.workspace.exportJSX();
      //   const snapshot = editor.workspace.exportSnapshot();

      //   console.log('--- jsx ---', jsx);
      //   console.log('--- snapshot ---', snapshot);
      // });
    }
  }, []);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default MarkdownEditor;
