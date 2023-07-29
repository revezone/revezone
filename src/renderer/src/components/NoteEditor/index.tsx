import { useEffect, useState } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import type { Page } from '@blocksuite/store';

const { workspace } = blocksuiteStorage;

interface Props {
  pageId: string;
}

function NoteEditor({ pageId }: Props): JSX.Element | null {
  if (!pageId) {
    return null;
  }

  const [currentPage, setCurrentPage] = useState<Page>();

  useEffect(() => {
    const page = workspace.getPage(pageId) || workspace.createPage({ id: pageId });
    setCurrentPage(page);
  }, [pageId]);

  return currentPage ? <RevenoteBlockSuiteEditor page={currentPage} /> : null;
}

export default NoteEditor;
