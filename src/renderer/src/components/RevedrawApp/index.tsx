import { useCallback, useEffect, useRef, useState } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { boardIndexeddbStorage, ExcalidrawDataSource } from '@renderer/store/boardIndexeddb';
import { useDebounceFn } from 'ahooks';
import { langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { emitter } from '@renderer/store/eventemitter';
import useDoubleLink from '@renderer/hooks/useDoubleLink';

import '@excalidraw/excalidraw/index.css';
import './index.css';
import useFileTree from '@renderer/hooks/useFileTree';

interface Props {
  file: RevezoneFile;
}

export default function RevedrawApp({ file }: Props) {
  const [initialData, setInitialData] = useState<ExcalidrawDataSource | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [systemLangCode] = useAtom(langCodeAtom);
  const { onLinkOpen } = useDoubleLink(true);
  const { fileTree } = useFileTree();

  const clearDeletedElements = useCallback((data: ExcalidrawDataSource): ExcalidrawDataSource => {
    if (!data?.elements) return data;

    const elements = (data.elements as Array<{ isDeleted?: boolean; fileId?: string }>);
    const files = { ...(data.files || {}) } as Record<string, unknown>;

    elements.forEach((element) => {
      if (element?.isDeleted && element.fileId) {
        delete files[element.fileId];
      }
    });

    return {
      ...data,
      elements: elements.filter((el) => !el.isDeleted),
      files
    };
  }, []);

  const loadData = useCallback(async (id: string) => {
    setInitialData(null);

    let data = await boardIndexeddbStorage.getBoard(id);
    if (!data) {
      setInitialData({ elements: [] });
      return;
    }

    data = clearDeletedElements(data);
    setInitialData(data);
  }, [clearDeletedElements]);

  useEffect(() => {
    loadData(file.id);
  }, [file.id]);

  useEffect(() => {
    const handler = () => loadData(file.id);
    emitter.on('switch_font_family', handler);
    return () => {
      emitter.off('switch_font_family', handler);
    };
  }, [file.id, loadData]);

  const onChangeFn = useCallback(
    async (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      const data: ExcalidrawDataSource = {
        type: 'excalidraw',
        version: 2,
        source: typeof window !== 'undefined' ? window.location.href : '',
        elements: elements as unknown[],
        appState: appState as Record<string, unknown>,
        files: files as Record<string, unknown>
      };

      await boardIndexeddbStorage.updateBoard(file.id, data, fileTree);
    },
    [file.id, fileTree]
  );

  const { run: onChangeDebounceFn, cancel: cancelDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  useEffect(() => {
    return () => {
      cancelDebounceFn();
    };
  }, [file.id]);

  if (!initialData) return null;

  return (
    <div className="revedraw-container w-full h-full">
      <Excalidraw
        key={file.id}
        initialData={initialData}
        langCode={systemLangCode}
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        onChange={onChangeDebounceFn}
        onLinkOpen={(element, event) => {
          onLinkOpen(element, event as unknown as Event);
        }}
      />
    </div>
  );
}
