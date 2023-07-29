import { useCallback, useEffect, useState } from 'react';
import { FileTreeItem, RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { ExcalidrawImperativeAPI, NonDeletedExcalidrawElement } from 'revemate/es/Revedraw/types';
import { boardIndexeddbStorage } from '@renderer/store/boardIndexeddb';
import { useDebounceFn } from 'ahooks';
import { PencilLine } from 'lucide-react';
import CustomFontModal from '../CustomFontModal';
import { currentFileIdAtom, fileTreeAtom, langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { DOUBLE_LINK_REGEX } from '@renderer/utils/constant';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [, setRef] = useState<ExcalidrawImperativeAPI>();
  const [fileTree] = useAtom(fileTreeAtom);
  const [, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [langCode, setLangCode] = useAtom(langCodeAtom);

  const { t, i18n } = useTranslation();

  const getDataSource = useCallback(async (id) => {
    // reset data source for a new canvas file
    setDataSource(undefined);

    const data = await boardIndexeddbStorage.getBoard(id);

    setDataSource(data || DEFAULT_DATA_SOURCE);
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
          setCurrentFileId(file.id);
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

  // useEffect(() => {
  //   i18n.changeLanguage(langCode);
  //   console.log('langCode', langCode);
  // }, [langCode]);

  return dataSource ? (
    <>
      <Revedraw
        dataSource={dataSource}
        canvasName={file.name}
        getRef={(ref) => setRef(ref)}
        systemLangCode={langCode}
        onChange={onChangeDebounceFn}
        onLangCodeChange={(code) => setLangCode(code)}
        onLinkOpen={onLinkOpen}
        customMenuItems={[
          <button
            key="custom-font"
            className="dropdown-menu-item dropdown-menu-item-base"
            title={t('menu.loadCustomFont')}
            onClick={() => setIsModalOpen(true)}
          >
            <PencilLine className="revenote-app-custom-font-icon" />
            {t('menu.customFont')}
          </button>
        ]}
      />
      <CustomFontModal open={isModalOpen} closeModal={() => setIsModalOpen(false)} />
    </>
  ) : null;
}
