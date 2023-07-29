import { useEffect, useRef } from 'react';
import { EditorContainer } from '@blocksuite/editor';
import { Page } from '@blocksuite/store';
import '@blocksuite/editor/themes/affine.css';

import './index.css';

interface Props {
  page: Page;
}

export default function RevenoteBlockSuiteEditor({ page }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editorContainer = new EditorContainer();

    editorContainer.page = page;

    containerRef.current?.appendChild(editorContainer);

    return () => {
      containerRef.current?.removeChild(editorContainer);
    };
  }, [page]);

  return (
    <div
      className="blocksuite-editor-container"
      style={{ width: '100%', height: '100%' }}
      ref={containerRef}
    ></div>
  );
}
