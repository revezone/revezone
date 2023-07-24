import { useCallback, useEffect, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { canvasIndexeddbStorage } from '@renderer/store/canvasIndexeddb';
import { useDebounceFn } from 'ahooks';
import { Button } from 'antd';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';

export default function Handraw({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();

  const getDataSource = useCallback(async (id) => {
    const data = await canvasIndexeddbStorage.getCanvas(id);

    setDataSource(data || DEFAULT_DATA_SOURCE);
  }, []);

  const onChangeFn = useCallback(async (data) => {
    console.log('--- onchange ---', data);

    const str = JSON.stringify(data);

    await canvasIndexeddbStorage.addOrUpdateCanvas(file.id, str);
  }, []);

  const { run: onChangeDebounceFn } = useDebounceFn(onChangeFn, { wait: 200 });

  const openFile = useCallback(() => {
    window.api.openFile(null);
  }, []);

  useEffect(() => {
    getDataSource(file.id);
  }, [file.id]);

  return dataSource ? (
    <Revedraw
      dataSource={dataSource}
      canvasName={file.name}
      onChange={onChangeDebounceFn}
      customMenuItems={[
        <Button key="open-file" onClick={openFile}>
          open file
        </Button>
      ]}
    />
  ) : null;
}
