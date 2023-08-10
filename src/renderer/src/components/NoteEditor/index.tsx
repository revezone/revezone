import { useCallback, useEffect, useRef, useState } from 'react';
import '@blocksuite/editor';
import '@blocksuite/editor/themes/affine.css';
import RevezoneBlockSuiteEditor from '../RevezoneBlockSuiteEditor';
import { Input } from 'antd';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { RevezoneFile } from '@renderer/types/file';

import './index.css';
import useFileTree from '@renderer/hooks/useFileTree';
import { useTranslation } from 'react-i18next';

interface Props {
  file: RevezoneFile;
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
      editor = new RevezoneBlockSuiteEditor({
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

  const onPressEnter = useCallback(() => {
    const richText = document
      .querySelector('.affine-frame-block-container')
      ?.querySelector('.affine-rich-text');

    // @ts-ignore
    richText?.focus();
  }, []);

  return (
    <div className="blocksuite-editor-container">
      <div className="note-editor-title border-slate-100 border-b">
        <Input.TextArea
          className="text-3xl font-bold px-6"
          bordered={false}
          value={title}
          autoSize={{ minRows: 1, maxRows: 6 }}
          style={{ whiteSpace: 'pre-wrap' }}
          placeholder={t('text.untitled')}
          onChange={onPageTitleChange}
          onPressEnter={onPressEnter}
        ></Input.TextArea>
      </div>
      <div className="blocksuite-editor-content" ref={editorRef}></div>
    </div>
  );
}

export default NoteEditor;
