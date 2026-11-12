import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Tldraw,
  TLINSTANCE_ID,
  createTLStore,
  defaultShapeUtils,
  type Editor
} from '@tldraw/tldraw';
import { useTranslation } from 'react-i18next';
import { registerAiEditor } from '@renderer/ai/editorRegistry';
import { createTldrawAdapter } from '@renderer/ai/tldrawAdapter';
import useFileTree from '@renderer/hooks/useFileTree';
import { tldrawIndexeddbStorage, type TLDrawData } from '@renderer/store/tldrawIndexeddb';
import type { RevezoneFile } from '@renderer/types/file';
import { tldrawCanvasDisplayOverrides, tldrawCanvasDisplayStyles } from './canvasDisplay';
import '@tldraw/tldraw/tldraw.css';
import './index.css';

function snapshotBoard(store: Editor['store']): TLDrawData {
  return { ...store.getSnapshot('document'), instanceState: store.get(TLINSTANCE_ID) };
}

function sameJson(previous: unknown, next: unknown): boolean {
  if (previous === next) return true;
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object') return false;

  if (Array.isArray(previous) || Array.isArray(next)) {
    return (
      Array.isArray(previous) &&
      Array.isArray(next) &&
      previous.length === next.length &&
      previous.every((value, index) => sameJson(value, next[index]))
    );
  }

  const nextRecord = next as Record<string, unknown>;
  const entries = Object.entries(previous);
  return (
    entries.length === Object.keys(nextRecord).length &&
    entries.every(
      ([key, value]) => Object.hasOwn(nextRecord, key) && sameJson(value, nextRecord[key])
    )
  );
}

function sameInstanceState(
  previous: TLDrawData['instanceState'],
  next: TLDrawData['instanceState']
) {
  if (previous === next) return true;
  if (!previous || !next) return false;

  // Focus, menu state, and viewport bounds can change without editing the board.
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]) as Set<keyof typeof next>;
  keys.delete('isFocused');
  keys.delete('screenBounds');
  keys.delete('openMenus');
  for (const key of keys) {
    if (!sameJson(previous[key], next[key])) return false;
  }
  return true;
}

function sameSnapshot(previous: TLDrawData, next: TLDrawData) {
  if (!sameInstanceState(previous.instanceState, next.instanceState)) return false;
  const records = Object.values(next.store);
  return (
    records.length === Object.keys(previous.store).length &&
    records.every((record) => sameJson(previous.store[record.id], record))
  );
}

function TldrawDocument({ id }: { id: string }) {
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const { fileTree } = useFileTree();
  const fileTreeRef = useRef(fileTree);
  fileTreeRef.current = fileTree;
  const { i18n } = useTranslation();

  useEffect(() => {
    let active = true;
    void tldrawIndexeddbStorage
      .getTldraw(id)
      .then((data) => {
        if (!active) return;
        if (!data) throw new Error('Tldraw board data is missing.');
        store.loadSnapshot(data);
        const instance = store.get(TLINSTANCE_ID);
        if (instance && data.instanceState) {
          const { currentPageId, ...settings } = data.instanceState;
          store.put([
            {
              ...instance,
              ...settings,
              id: instance.id,
              typeName: instance.typeName,
              currentPageId:
                currentPageId && store.has(currentPageId) ? currentPageId : instance.currentPageId
            }
          ]);
        }
        setLoad('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Could not load the Tldraw board', error);
        setLoad('error');
      });
    return () => {
      active = false;
    };
  }, [id, store]);

  const onMount = useCallback(
    (editor: Editor) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let saved = snapshotBoard(store);
      let queued = saved;
      let pending = Promise.resolve();

      const flush = () => {
        clearTimeout(timer);
        const data = snapshotBoard(store);
        if (sameSnapshot(queued, data)) return pending;
        queued = data;
        pending = tldrawIndexeddbStorage.updateTldraw(id, data, fileTreeRef.current).then(
          () => {
            saved = data;
          },
          (error) => {
            if (queued === data) {
              queued = saved;
              pending = Promise.resolve();
            }
            throw error;
          }
        );
        return pending;
      };

      const save = () => {
        void flush().catch((error) => console.error('Could not save the Tldraw board', error));
      };
      const saveWhenHidden = () => {
        if (document.visibilityState === 'hidden') save();
      };
      const unsubscribe = store.listen(() => {
        clearTimeout(timer);
        timer = setTimeout(save, 200);
      });
      const unregister = registerAiEditor(createTldrawAdapter(id, editor, flush));
      document.addEventListener('visibilitychange', saveWhenHidden);
      window.addEventListener('pagehide', save);

      return () => {
        window.removeEventListener('pagehide', save);
        document.removeEventListener('visibilitychange', saveWhenHidden);
        unsubscribe();
        save();
        unregister();
      };
    },
    [id, store]
  );

  if (load === 'error') {
    return (
      <p className="p-4" role="alert">
        {i18n.language.startsWith('zh')
          ? '无法加载 Tldraw 白板。'
          : 'Could not load this Tldraw board.'}
      </p>
    );
  }

  return (
    <div className="tldraw-editor-container w-full h-full" aria-busy={load === 'loading'}>
      <style>{tldrawCanvasDisplayStyles}</style>
      {load === 'ready' && (
        <Tldraw
          store={store}
          autoFocus
          onMount={onMount}
          overrides={tldrawCanvasDisplayOverrides}
        />
      )}
    </div>
  );
}

export default function ReveTldraw({ file }: { file: RevezoneFile }) {
  return <TldrawDocument key={file.id} id={file.id} />;
}
