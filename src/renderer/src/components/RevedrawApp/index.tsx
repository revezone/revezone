import { useCallback, useEffect, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { canvasIndexeddbStorage } from '@renderer/store/canvasIndexeddb';
import { useDebounceFn } from 'ahooks';
import { PencilLine } from 'lucide-react';
import CustomFontModal from '../CustomFontModal';
import { langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [langCode, setLangCode] = useAtom(langCodeAtom);

  const { t, i18n } = useTranslation();

  const getDataSource = useCallback(async (id) => {
    // reset data source for a new canvas file
    setDataSource(undefined);

    const data = await canvasIndexeddbStorage.getCanvas(id);

    setDataSource(data || DEFAULT_DATA_SOURCE);
  }, []);

  const onChangeFn = useCallback(
    async (data) => {
      console.log('--- onchange ---', data);

      const str = JSON.stringify(data);

      await canvasIndexeddbStorage.addOrUpdateCanvas(file.id, str);
    },
    [file.id]
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

  useEffect(() => {
    i18n.changeLanguage(langCode);
    console.log('langCode', langCode);
  }, [langCode]);

  return dataSource ? (
    <>
      <Revedraw
        dataSource={dataSource}
        canvasName={file.name}
        onChange={onChangeDebounceFn}
        onLangCodeChange={(code) => setLangCode(code)}
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
