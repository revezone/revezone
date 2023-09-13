import { useState, useEffect } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Tldraw, Editor } from '@tldraw/tldraw';
import { getFileDataChangeDebounceFn } from '@renderer/utils/file';

import '@tldraw/tldraw/tldraw.css';
import useFileTree from '@renderer/hooks/useFileTree';

interface Props {
  file: RevezoneFile;
}

const fileDataChangeDebounceFn = getFileDataChangeDebounceFn();

export default function ReveTldraw(props: Props) {
  const { file } = props;
  const [editor, setEditor] = useState<Editor>();
  const { fileTree } = useFileTree();

  useEffect(() => {
    editor?.store?.listen((entry) => {
      //   entry; // { changes, source }
      console.log('--- store change ---', entry, editor.store.getSnapshot());

      const str = JSON.stringify(editor.store.getSnapshot());

      fileDataChangeDebounceFn(file.id, str, fileTree);
    });
  }, [editor, file, fileTree]);

  const onUiEvent = (name, data) => {
    console.log('--- onUiEvent ---', name, data);
  };

  return (
    <div className="tldraw__editor w-full h-full">
      <Tldraw
        persistenceKey={file.id}
        autoFocus
        onUiEvent={onUiEvent}
        onMount={(editor) => {
          setEditor(editor);
        }}
      />
    </div>
  );
}
