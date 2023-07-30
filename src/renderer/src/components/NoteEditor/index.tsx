import { useEffect, useRef } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';

import './index.css';

interface Props {
  pageId: string;
}

function NoteEditor({ pageId }: Props): JSX.Element | null {
  if (!pageId) {
    return null;
  }

  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!pageId || editorMountRef.current) {
      return;
    }

    editorMountRef.current = true;

    let editor;

    if (editorRef.current) {
      editor = new RevenoteBlockSuiteEditor({
        pageId
      });

      editorRef.current.innerHTML = '';

      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;
    }

    return () => {
      editorRef.current?.removeChild(editor);
    };
  }, [pageId]);

  useEffect(() => {
    editorMountRef.current = false;
  }, [pageId]);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default NoteEditor;
