import { useCallback, useEffect, useRef, useState } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevezoneBlockSuiteEditor from '../RevezoneBlockSuiteEditor';
import { RevezoneFile } from '@renderer/types/file';

import './index.css';

interface Props {
  file: RevezoneFile;
}

function NoteEditor({ file }: Props): JSX.Element | null {
  if (!file) {
    return null;
  }

  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!file || editorMountRef.current) {
      return;
    }

    editorMountRef.current = true;

    let editor: RevezoneBlockSuiteEditor;

    if (editorRef.current) {
      editor = new RevezoneBlockSuiteEditor({
        pageId: file.id
      });

      editorRef.current.innerHTML = '';

      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;
    }

    return () => {
      console.log('--- note unmount remove ---', editorRef.current, editor);

      editorRef.current?.removeChild(editor);
    };
  }, [file.id]);

  useEffect(() => {
    editorMountRef.current = false;
  }, [file.id]);

  return <div className="blocksuite-editor-container" ref={editorRef}></div>;
}

export default NoteEditor;
