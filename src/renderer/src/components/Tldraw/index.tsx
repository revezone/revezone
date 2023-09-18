import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import type { StoreSnapshot, TLRecord } from '@tldraw/tldraw';
import { sendFileDataChangeToMainDebounceFn } from '@renderer/utils/file';
import useFileTree from '@renderer/hooks/useFileTree';
import { tldrawIndexeddbStorage } from '@renderer/store/tldrawIndexeddb';

import '@tldraw/tldraw/tldraw.css';

interface Props {
  file: RevezoneFile;
  snapshot?: StoreSnapshot<TLRecord>;
}

export default function ReveTldraw(props: Props) {
  const { file } = props;
  const [editor, setEditor] = useState<Editor>();
  const { fileTree } = useFileTree();
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));

  const getData = async () => {
    const data = await tldrawIndexeddbStorage.getTldraw(file.id);

    if (!data) return;

    console.log('data', data);

    store.loadSnapshot(data);
  };

  useLayoutEffect(() => {
    getData();
  }, [store]);

  useEffect(() => {
    editor?.store?.listen((entry) => {
      if (!editor) return;

      const snapshot = editor.store.getSnapshot();

      tldrawIndexeddbStorage.updateTldraw(file.id, snapshot, fileTree);

      const snapshotStr = JSON.stringify(snapshot);

      sendFileDataChangeToMainDebounceFn(file.id, snapshotStr, fileTree);
    });
  }, [editor, fileTree]);

  return (
    <div className="tldraw__editor w-full h-full">
      <Tldraw
        store={store}
        autoFocus
        onMount={(editor) => {
          setEditor(editor);
        }}
      />
    </div>
  );
}
