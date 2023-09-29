import { useEffect, useRef } from 'react';
import '@revesuite/editor';
import '@revesuite/editor/themes/affine.css';
import RevezoneBlockSuiteEditor from '../RevezoneBlockSuiteEditor';
import { RevezoneFile } from '@renderer/types/file';
import useDoubleLink from '@renderer/hooks/useDoubleLink';

import './index.css';

interface Props {
  file: RevezoneFile;
}

function NoteEditor({ file }: Props): JSX.Element | null {
  const { onLinkOpen, tabModel, fileTree } = useDoubleLink(false);
  const editorDomRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RevezoneBlockSuiteEditor>();
  const editorMountRef = useRef(false);

  if (!file) {
    return null;
  }

  useEffect(() => {
    if (!file || editorMountRef.current) {
      return;
    }

    editorMountRef.current = true;

    // let editor: RevezoneBlockSuiteEditor | undefined;

    if (editorDomRef.current) {
      editorRef.current = new RevezoneBlockSuiteEditor({
        pageId: file.id,
        onLinkOpen
      });

      editorDomRef.current.innerHTML = '';

      editorDomRef.current?.appendChild(editorRef.current);

      // @ts-ignore TEST
      window.editor = editor;
    }

    return () => {
      editorRef.current && editorDomRef.current?.removeChild(editorRef.current);
      editorRef.current = undefined;
      editorMountRef.current = false;
    };
  }, [file.id, tabModel, fileTree, onLinkOpen]);

  useEffect(() => {
    editorMountRef.current = false;
  }, [file.id]);

  return <div className="blocksuite-editor-container" ref={editorDomRef}></div>;
}

export default NoteEditor;
