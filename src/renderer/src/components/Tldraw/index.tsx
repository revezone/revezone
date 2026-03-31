import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { RevezoneFile, RevezoneFileTree } from '@renderer/types/file';
import { Tldraw, Editor, createTLStore, defaultShapeUtils, getSnapshot, loadSnapshot } from 'tldraw';
import type { TLEditorSnapshot, TLStoreSnapshot } from 'tldraw';
import { sendFileDataChangeToMainDebounceFn } from '@renderer/utils/file';
import useFileTree from '@renderer/hooks/useFileTree';
import { tldrawIndexeddbStorage } from '@renderer/store/tldrawIndexeddb';
import { useDebounceFn } from 'ahooks';

import 'tldraw/tldraw.css';

import './index.css';

interface Props {
  file: RevezoneFile;
  snapshot?: TLEditorSnapshot;
}

/** Detect if stored data is old-format TLStoreSnapshot (pre-v4) */
function isLegacySnapshot(data: unknown): data is TLStoreSnapshot {
  return (
    typeof data === 'object' &&
    data !== null &&
    'store' in data &&
    !('document' in data)
  );
}

export default function ReveTldraw(props: Props) {
  const { file } = props;
  const [editor, setEditor] = useState<Editor>();
  const { fileTree } = useFileTree();

  const [store] = useState(() => createTLStore({ shapeUtils: [...defaultShapeUtils] }));

  const loadData = async () => {
    const data = await tldrawIndexeddbStorage.getTldraw(file.id);
    if (!data) return;

    try {
      if (isLegacySnapshot(data)) {
        // Old format: TLStoreSnapshot — load via standalone loadSnapshot()
        loadSnapshot(store, data);
      } else {
        // New format: TLEditorSnapshot
        loadSnapshot(store, data as TLEditorSnapshot);
      }
    } catch (err) {
      console.warn('[ReveTldraw] Failed to load snapshot, starting fresh:', err);
    }
  };

  const onChangeFn = useCallback((editor: Editor, fileTree: RevezoneFileTree) => {
    if (!editor) return;

    const snapshot: TLEditorSnapshot = getSnapshot(editor.store);

    tldrawIndexeddbStorage.updateTldraw(file.id, snapshot, fileTree);

    sendFileDataChangeToMainDebounceFn(file.id, JSON.stringify(snapshot), fileTree);
  }, []);

  const { run: onChangeDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  useLayoutEffect(() => {
    loadData();
  }, [store]);

  useEffect(() => {
    editor?.store?.listen(() => {
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
