import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Revedraw } from 'revemate';
import type { ExcalidrawDataSource, ExcalidrawImperativeAPI } from 'revemate/es/Revedraw/types';
import { useDebounceFn } from 'ahooks';
import { useAtom } from 'jotai';
import { createBoardAdapter, readBoard } from '@renderer/ai/boardAdapter';
import { registerAiEditor } from '@renderer/ai/editorRegistry';
import useDoubleLink from '@renderer/hooks/useDoubleLink';
import useFileTree from '@renderer/hooks/useFileTree';
import { boardIndexeddbStorage, type StoredBoard } from '@renderer/store/boardIndexeddb';
import { useCanvasDisplay } from '@renderer/store/canvasDisplay';
import { emitter } from '@renderer/store/eventemitter';
import { langCodeAtom } from '@renderer/store/jotai';
import { useWindowColor } from '@renderer/store/windowColor';
import type { RevezoneFile } from '@renderer/types/file';
import './index.css';

type BoardTheme = ExcalidrawDataSource['appState']['theme'];

function boardViewSettings({ appState }: ExcalidrawDataSource) {
  const drawingDefaults = Object.entries(appState).filter(([key]) => key.startsWith('currentItem'));
  return JSON.stringify([
    appState.scrollX,
    appState.scrollY,
    appState.zoom?.value,
    appState.exportBackground,
    appState.exportWithDarkMode,
    appState.exportEmbedScene,
    appState.exportScale,
    appState.activeTool,
    appState.penMode,
    appState.showStats,
    drawingDefaults
  ]);
}

export default function RevedrawApp({ file }: { file: RevezoneFile }) {
  const [dataSource, setDataSource] = useState<StoredBoard>();
  const [api, setApi] = useState<ExcalidrawImperativeAPI>();
  const [fontRevision, setFontRevision] = useState(0);
  const [systemLangCode] = useAtom(langCodeAtom);
  const { display } = useCanvasDisplay();
  const { color } = useWindowColor();
  const { onLinkOpen } = useDoubleLink(true);
  const { fileTree } = useFileTree();
  const fileTreeRef = useRef(fileTree);
  fileTreeRef.current = fileTree;
  const lastData = useRef<ExcalidrawDataSource>();
  const lastScene = useRef('');
  const lastViewSettings = useRef('');
  const pendingSave = useRef<ExcalidrawDataSource>();
  const changeListeners = useRef(new Set<() => void>());
  const storedThemes = useRef<{ wrapper?: string; editor?: BoardTheme }>({});
  const originalTheme = storedThemes.current.wrapper === 'dark' ? 'dark' : 'light';
  const displayTheme = display === 'follow-window' ? color : originalTheme;
  const screenDataSource = useMemo(() => {
    if (!dataSource) return undefined;
    // Revemate controls its editor theme through dataSource. Its export renderer uses the
    // separate exportWithDarkMode setting instead of this live theme.
    return JSON.stringify({
      ...dataSource,
      theme: displayTheme,
      appState: { ...dataSource.appState, theme: displayTheme }
    });
  }, [dataSource, displayTheme]);

  const persist = useCallback(
    (data: ExcalidrawDataSource) => {
      const { theme: _viewTheme, appState: state, ...document } = data;
      const { theme: _editorTheme, ...appState } = state;
      const { wrapper, editor } = storedThemes.current;
      const scene = {
        type: 'excalidraw',
        version: 2,
        source: window.location.href,
        ...document,
        ...(wrapper === undefined ? {} : { theme: wrapper }),
        appState: editor === undefined ? appState : { ...appState, theme: editor }
      };
      return boardIndexeddbStorage.updateBoard(file.id, scene, fileTreeRef.current);
    },
    [file.id]
  );

  const persistPending = useCallback(async () => {
    const data = pendingSave.current;
    if (!data) return;
    await persist(data);
    if (pendingSave.current === data) pendingSave.current = undefined;
  }, [persist]);

  const { run: saveDebounced, cancel: cancelSave } = useDebounceFn(
    () => {
      void persistPending().catch(console.error);
    },
    { wait: 200 }
  );

  useEffect(() => {
    let active = true;
    void boardIndexeddbStorage.getBoard(file.id).then((data) => {
      if (!active) return;
      let source: StoredBoard | undefined;
      try {
        source = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        console.error(error);
      }
      storedThemes.current = { wrapper: source?.theme, editor: source?.appState?.theme };
      setDataSource(source ?? { elements: [] });
    });
    return () => {
      active = false;
      cancelSave();
      void persistPending().catch(console.error);
    };
  }, [file.id, persistPending, cancelSave]);

  useEffect(() => {
    const remount = () => {
      const data = lastData.current;
      if (data) {
        setDataSource(data);
        setApi(undefined);
        setFontRevision((revision) => revision + 1);
      }
    };
    emitter.on('switch_font_family', remount);
    return () => {
      emitter.off('switch_font_family', remount);
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const flush = async () => {
      cancelSave();
      const pending = pendingSave.current;
      const scene = readBoard(api);
      const appState = api.getAppState();
      const data: ExcalidrawDataSource = {
        ...lastData.current,
        theme: appState.theme,
        langCode: lastData.current?.langCode ?? systemLangCode,
        appState: {
          ...appState,
          selectedElementIds: {},
          collaborators: new Map()
        },
        elements: scene.elements,
        files: scene.files
      };
      lastData.current = data;
      await persist(data);
      if (pendingSave.current === pending) pendingSave.current = undefined;
    };
    return registerAiEditor(createBoardAdapter(file.id, api, changeListeners.current, flush));
  }, [api, cancelSave, file.id, persist, systemLangCode]);

  const onBoardChange = (data: ExcalidrawDataSource) => {
    if (data.appState?.isLoading) return;
    lastData.current = data;
    const revision = JSON.stringify([
      data.elements.map((element) => [element.id, element.versionNonce, element.isDeleted]),
      Object.keys(data.files ?? {}),
      data.appState?.viewBackgroundColor
    ]);
    const viewSettings = boardViewSettings(data);
    const initialized = lastScene.current !== '';
    const sceneChanged = revision !== lastScene.current;
    const viewSettingsChanged = viewSettings !== lastViewSettings.current;
    lastScene.current = revision;
    lastViewSettings.current = viewSettings;
    if (initialized && (sceneChanged || viewSettingsChanged)) pendingSave.current = data;
    if (initialized && sceneChanged) {
      saveDebounced();
      for (const listener of changeListeners.current) listener();
    }
  };

  return screenDataSource ? (
    <Revedraw
      key={fontRevision}
      dataSource={screenDataSource}
      canvasName={file.name}
      getRef={setApi}
      systemLangCode={systemLangCode}
      onChange={onBoardChange}
      onLinkOpen={onLinkOpen}
    />
  ) : null;
}
