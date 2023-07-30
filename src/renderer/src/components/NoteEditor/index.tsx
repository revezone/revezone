import { useCallback, useEffect, useRef, useState } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevenoteBlockSuiteEditor from '../RevenoteBlockSuiteEditor';
import { Input } from 'antd';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { RevenoteFile } from '@renderer/types/file';

import './index.css';
import useFileTree from '@renderer/hooks/useFileTree';
import { useTranslation } from 'react-i18next';

interface Props {
  file: RevenoteFile;
}

function NoteEditor({ file }: Props): JSX.Element | null {
  if (!file) {
    return null;
  }

  const editorRef = useRef<HTMLDivElement>(null);
  const editorMountRef = useRef(false);
  const [title, setTitle] = useState(file.name);
  const { getFileTree } = useFileTree();
  const { t } = useTranslation();

  useEffect(() => {
    if (!file || editorMountRef.current) {
      return;
    }

    editorMountRef.current = true;

    let editor;

    if (editorRef.current) {
      editor = new RevenoteBlockSuiteEditor({
        pageId: file.id
      });

      editorRef.current.innerHTML = '';

      editorRef.current?.appendChild(editor);

      // @ts-ignore TEST
      window.editor = editor;
    }

    return () => {
      editorRef.current?.removeChild(editor);
    };
  }, [file.id]);

  useEffect(() => {
    setTitle(file.name);
  }, [file.name]);

  useEffect(() => {
    editorMountRef.current = false;
  }, [file.id]);

  const onPageTitleChange = useCallback(
    (e) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      menuIndexeddbStorage.updateFileName(file, newTitle);
      getFileTree();
    },
    [file.id]
  );

  return (
    <div className="blocksuite-editor-container">
      <Input
        className="text-4xl font-bold px-5"
        bordered={false}
        value={title}
        placeholder={t('text.untitled')}
        onChange={onPageTitleChange}
      ></Input>
      <div className="blocksuite-editor-content" ref={editorRef}></div>
    </div>
  );
}

export default NoteEditor;
