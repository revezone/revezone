import { useEffect, useRef } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';

import './index.css';

interface Props {
  pageId: string | undefined;
}

function MarkdownEditor({ pageId }: Props): JSX.Element | null {
  console.log('markdoweditor', pageId);

  if (!pageId) {
    return null;
  }

  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!pageId || editorMountRef.current) {
      return;
    }

    console.log('markdoweditor', pageId, editorMountRef.current);

    editorMountRef.current = true;

    if (editorRef.current) {
      const editor = new RevenoteBlockSuiteEditor({
        pageId
      });

      editorRef.current.innerHTML = '';

      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;
    }
  }, [pageId, editorMountRef.current]);

  useEffect(() => {
    editorMountRef.current = !editorMountRef.current;
  }, [pageId]);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default MarkdownEditor;
