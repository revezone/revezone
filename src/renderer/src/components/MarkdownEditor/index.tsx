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
    if (!currentFileId || editorMountRef.current) {
      return;
    }

    editorMountRef.current = true;

    console.log('currentFileId', currentFileId);

    if (editorRef.current) {
      const editor = new RevenoteBlockSuiteEditor({
        pageId: currentFileId
      });

      editorRef.current.innerHTML = '';

      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;
    }
  }, [currentFileId, editorMountRef.current]);

  useEffect(() => {
    editorMountRef.current = !editorMountRef.current;
  }, [currentFileId]);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default MarkdownEditor;
