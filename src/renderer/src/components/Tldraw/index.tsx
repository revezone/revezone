import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { RevezoneFile, RevezoneFileTree } from '@renderer/types/file';
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import { StoreSnapshot, TLRecord, TLInstanceId } from '@tldraw/tldraw';
import { sendFileDataChangeToMainDebounceFn } from '@renderer/utils/file';
import useFileTree from '@renderer/hooks/useFileTree';
import { tldrawIndexeddbStorage } from '@renderer/store/tldrawIndexeddb';
import { useDebounceFn } from 'ahooks';

import '@tldraw/tldraw/tldraw.css';

import './index.css';

interface Props {
  file: RevezoneFile;
  snapshot?: StoreSnapshot<TLRecord>;
}

const INSTANCE_STATE_KEY = 'instance:instance' as TLInstanceId;

export default function ReveTldraw(props: Props) {
  const { file } = props;
  const [editor, setEditor] = useState<Editor>();
  const { fileTree } = useFileTree();
  const [instanceState, setInstanceState] = useState();

  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));

  const getData = async () => {
    const data = await tldrawIndexeddbStorage.getTldraw(file.id);

    if (!data) return;

    setInstanceState(data.instanceState);

    store.loadSnapshot(data);
  };

  const onChangeFn = useCallback((editor: Editor, fileTree: RevezoneFileTree) => {
    if (!editor) return;

    const snapshot = editor.store.getSnapshot();

    const instanceState = editor.store.get(INSTANCE_STATE_KEY);

    console.log('--- onChangeFn instanceState ---', instanceState);

    tldrawIndexeddbStorage.updateTldraw(file.id, { ...snapshot, instanceState }, fileTree);

    const snapshotStr = JSON.stringify(snapshot);

    sendFileDataChangeToMainDebounceFn(file.id, snapshotStr, fileTree);
  }, []);

  const { run: onChangeDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  useLayoutEffect(() => {
    getData();
  }, [store]);

  useEffect(() => {
    if (!(editor && instanceState)) return;
    editor.updateInstanceState(instanceState);
  }, [editor, instanceState]);

  useEffect(() => {
    editor?.store?.listen((entry) => {
      onChangeDebounceFn(editor, fileTree);
    });
  }, [editor, fileTree]);

  return (
    <div className="tldraw-editor-container w-full h-full">
      <Tldraw
        store={store}
        autoFocus
        onUiEvent={(name, data) => {
          console.log(name, data);
        }}
        onMount={(editor) => {
          setEditor(editor);
        }}
      />
    </div>
  );
}
