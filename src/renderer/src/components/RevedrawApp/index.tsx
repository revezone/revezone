import { useCallback, useEffect, useState } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import {
  ExcalidrawDataSource,
  ExcalidrawImperativeAPI,
  NonDeletedExcalidrawElement
} from 'revemate/es/Revedraw/types';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { useDebounceFn } from 'ahooks';
import { fileTreeAtom, langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { getOSName } from '@renderer/utils/navigator';
import { getFileIdOrNameFromLink } from '@renderer/utils/file';
import { emitter } from '@renderer/store/eventemitter';

import './index.css';
import useCurrentFile from '@renderer/hooks/useCurrentFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';

interface Props {
  file: RevezoneFile;
}

const OS_NAME = getOSName();

let firsRender = true;

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [, setRef] = useState<ExcalidrawImperativeAPI>();
  const [fileTree] = useAtom(fileTreeAtom);
  const [systemLangCode] = useAtom(langCodeAtom);
  const [didRender, setDidRender] = useState(true);
  const { updateCurrentFile } = useCurrentFile();
  const { model: tabModel, updateTabJsonModelWhenCurrentFileChanged } = useTabJsonModel();

  const getDataSource = useCallback(async (id: string) => {
    // reset data source for a new canvas file
    setDataSource(undefined);

    const data = await boardIndexeddbStorage.getBoard(id);

    setDataSource(data);
  }, []);

  // HACK: fix the custom font not working completely when first render
  const rerender = useCallback(() => {
    const WAIT_TIME_WINDWOS = 500;
    const WAIT_TIME_MACOS = 200;

    const waitTime = OS_NAME === 'MacOS' ? WAIT_TIME_MACOS : WAIT_TIME_WINDWOS;

    setTimeout(() => {
      setDidRender(false);
      setTimeout(() => {
        setDidRender(true);
      }, 100);
    }, waitTime);
  }, []);

  useEffect(() => {
    if (firsRender) {
      firsRender = false;
      rerender();
    }
  }, []);

  useEffect(() => {
    emitter.on('switch_font_family', () => {
      console.log('switch font');
      rerender();
    });
  }, []);

  const onChangeFn = useCallback(
    async (data: ExcalidrawDataSource) => {
      const str = JSON.stringify({
        type: 'excalidraw',
        version: 2,
        source: window.location.href,
        ...data
      });

      await boardIndexeddbStorage.addOrUpdateBoard(file.id, str, fileTree);
    },
    [file.id, fileTree]
  );

  const { run: onChangeDebounceFn, cancel: cancelDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  const onLinkOpen = useCallback(
    async (element: NonDeletedExcalidrawElement) => {
      const { link } = element;
      console.log('link', link);

      const fileIdOrNameInRevezone = link && getFileIdOrNameFromLink(link);

      if (fileIdOrNameInRevezone) {
        let file: RevezoneFile | undefined = fileTree[fileIdOrNameInRevezone].data as RevezoneFile;

        if (!file) {
          file = Object.values(fileTree).find((item) => item.data.name === fileIdOrNameInRevezone)
            ?.data as RevezoneFile;
        }

        if (file) {
          await updateCurrentFile(file);

          updateTabJsonModelWhenCurrentFileChanged(file, tabModel);
        }
      } else {
        link && window.open(link);
      }
    },
    [fileTree, tabModel]
  );

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
