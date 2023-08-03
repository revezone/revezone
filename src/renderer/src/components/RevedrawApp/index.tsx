import { useCallback, useEffect, useState } from 'react';
import { FileTreeItem, RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { ExcalidrawImperativeAPI, NonDeletedExcalidrawElement } from 'revemate/es/Revedraw/types';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { useDebounceFn } from 'ahooks';
import { PencilLine } from 'lucide-react';
import CustomFontModal from '../CustomFontModal';
import { currentFileAtom, fileTreeAtom, langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { DOUBLE_LINK_REGEX } from '@renderer/utils/constant';
import { getOSName, getIsInRevenoteApp } from '@renderer/utils/navigator';
import { Button, Tooltip } from 'antd';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';
const OS_NAME = getOSName();
const IS_IN_REVENOTE_APP = getIsInRevenoteApp();

let firsRender = true;

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [, setRef] = useState<ExcalidrawImperativeAPI>();
  const [fileTree] = useAtom(fileTreeAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [systemLangCode] = useAtom(langCodeAtom);
  const [didRender, setDidRender] = useState(true);

  const { t } = useTranslation();

  const getDataSource = useCallback(async (id) => {
    // reset data source for a new canvas file
    setDataSource(undefined);

    const data = await boardIndexeddbStorage.getBoard(id);

    setDataSource(data || DEFAULT_DATA_SOURCE);
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

  const onChangeFn = useCallback(
    async (data) => {
      const str = JSON.stringify(data);

      await boardIndexeddbStorage.addOrUpdateBoard(file.id, str);
    },
    [file.id]
  );

  const { run: onChangeDebounceFn, cancel: cancelDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  const onLinkOpen = useCallback(
    (element: NonDeletedExcalidrawElement) => {
      const { link } = element;
      console.log('link', link);

      if (link && DOUBLE_LINK_REGEX.test(link)) {
        const fileIdOrName = link?.match(DOUBLE_LINK_REGEX)?.[1];

        const files = fileTree?.reduce((prev: RevenoteFile[], item: FileTreeItem) => {
          return [...prev, ...item.children];
        }, []);

        const file = files.find(
          (_file) => _file.id === fileIdOrName || _file.name === fileIdOrName
        );

        if (file) {
          setCurrentFile(file);
        }
      } else {
        link && window.open(link);
      }
    },
    [fileTree]
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
          customMenuItems={[
            IS_IN_REVENOTE_APP ? (
              <Button
                key="custom-font"
                className={`dropdown-menu-item dropdown-menu-item-base`}
                title={t('menu.loadCustomFont')}
                onClick={() => setIsModalOpen(true)}
              >
                <PencilLine className="revenote-app-custom-font-icon" />
                {t('menu.customFont')}
              </Button>
            ) : (
              <p
                className="flex justify-start items-center cursor-pointer px-3 py-2 text-sm text-gray-400"
                onClick={() => window.open('https://github.com/revenote/revenote/releases')}
              >
                <PencilLine className="revenote-app-custom-font-icon w-3 h-3 " />
                <Tooltip title={t('menu.downloadApp')}>
                  <span className="pl-3">{t('menu.customFont')}</span>
                </Tooltip>
              </p>
            )
          ]}
        />
      ) : null}

      <CustomFontModal open={isModalOpen} closeModal={() => setIsModalOpen(false)} />
    </>
  ) : null;
}
