import { useState, useEffect, useLayoutEffect } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import type { StoreSnapshot, TLRecord } from '@tldraw/tldraw';
import { getFileDataChangeDebounceFn } from '@renderer/utils/file';
import useFileTree from '@renderer/hooks/useFileTree';

import '@tldraw/tldraw/tldraw.css';
import { tldrawIndexeddbStorage } from '@renderer/store/tldrawIndexeddb';

interface Props {
  file: RevezoneFile;
  snapshot?: StoreSnapshot<TLRecord>;
}

const fileDataChangeDebounceFn = getFileDataChangeDebounceFn();

export default function ReveTldraw(props: Props) {
  const { file } = props;
  const [editor, setEditor] = useState<Editor>();
  const { fileTree } = useFileTree();
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));

  const getData = async () => {
    const dataStr = (await tldrawIndexeddbStorage.getTldraw(file.id)) || '{}';
    const dataObj = JSON.parse(dataStr);
    store.loadSnapshot(dataObj);
  };

  useLayoutEffect(() => {
    getData();
  }, [store]);

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
        store={store}
        autoFocus
        onUiEvent={onUiEvent}
        onMount={(editor) => {
          setEditor(editor);
        }}
      />
    </div>
  );
}
