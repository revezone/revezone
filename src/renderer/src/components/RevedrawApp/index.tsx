import { useCallback, useEffect, useState } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { ExcalidrawDataSource, ExcalidrawImperativeAPI } from 'revemate/es/Revedraw/types';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { useDebounceFn } from 'ahooks';
import { langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { getOSName } from '@renderer/utils/navigator';
import { emitter } from '@renderer/store/eventemitter';
import useDoubleLink from '@renderer/hooks/useDoubleLink';

import './index.css';
import useFileTree from '@renderer/hooks/useFileTree';

interface Props {
  file: RevezoneFile;
}

const OS_NAME = getOSName();

let firsRender = true;

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [, setRef] = useState<ExcalidrawImperativeAPI>();
  const [systemLangCode] = useAtom(langCodeAtom);
  const [didRender, setDidRender] = useState(true);
  const { onLinkOpen } = useDoubleLink(true);
  const { fileTree } = useFileTree();

  const getDataSource = useCallback(async (id: string) => {
    // reset data source for a new canvas file
    setDataSource(undefined);

    const data = await boardIndexeddbStorage.getBoard(id);

    const dataStr = !data || typeof data === 'string' ? data : JSON.stringify(data);

    setDataSource(dataStr);
  }, []);

  // HACK: fix the custom font not working completely when first render
  const rerender = useCallback(async () => {
    const WAIT_TIME_WINDWOS = 500;
    const WAIT_TIME_MACOS = 200;

    const waitTime = OS_NAME === 'MacOS' ? WAIT_TIME_MACOS : WAIT_TIME_WINDWOS;

    await getDataSource(file.id);

    setTimeout(() => {
      setDidRender(false);
      setTimeout(() => {
        setDidRender(true);
      }, 100);
    }, waitTime);
  }, [file.id]);

  useEffect(() => {
    if (firsRender) {
      firsRender = false;
      rerender();
    }
  }, []);

  useEffect(() => {
    emitter.on('switch_font_family', () => {
      rerender();
    });
  }, []);

  const onChangeFn = useCallback(
    async (data: ExcalidrawDataSource) => {
      const _data = {
        type: 'excalidraw',
        version: 2,
        source: window.location.href,
        ...data
      };

      await boardIndexeddbStorage.updateBoard(file.id, _data, fileTree);
    },
    [file.id, fileTree]
  );

  const { run: onChangeDebounceFn, cancel: cancelDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  useEffect(() => {
    getDataSource(file.id);
    return () => {
      cancelDebounceFn();
    };
  }, [file.id]);

  return dataSource ? (
    <>
      {didRender ? (
        <Revedraw
          dataSource={dataSource}
          canvasName={file.name}
          getRef={(ref) => setRef(ref)}
          systemLangCode={systemLangCode}
          onChange={onChangeDebounceFn}
          onLinkOpen={onLinkOpen}
        />
      ) : null}
    </>
  ) : null;
}
