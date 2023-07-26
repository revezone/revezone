import { useCallback, useEffect, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { canvasIndexeddbStorage } from '@renderer/store/canvasIndexeddb';
import { useDebounceFn, useUpdate } from 'ahooks';
import { PencilIcon } from '@heroicons/react/24/outline';
import CustomFontModal from '../CustomFontModal';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';

export default function RevedrawApp({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const forceUpdateFn = useUpdate();

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

  return dataSource ? (
    <>
      <Revedraw
        dataSource={dataSource}
        canvasName={file.name}
        onChange={onChangeDebounceFn}
        customMenuItems={[
          <button
            key="custom-font"
            className="dropdown-menu-item dropdown-menu-item-base"
            title="Add Custom Font"
            onClick={() => setIsModalOpen(true)}
          >
            <PencilIcon className="revenote-app-custom-font-icon" />
            custom font size
          </button>
        ]}
      />
      <CustomFontModal
        open={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        forceUpdateRevedrawApp={forceUpdateFn}
      />
    </>
  ) : null;
}
