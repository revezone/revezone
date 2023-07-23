import { useCallback, useEffect, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { ExcalidrawApp } from 'handraw-materials';
import {
  ExcalidrawDataSource,
  NonDeletedExcalidrawElement
} from 'handraw-materials/es/ExcalidrawApp/types';
import { canvasIndexeddbStorage } from '@renderer/store/canvasIndexeddb';

interface Props {
  file: RevenoteFile;
}

export default function Handraw({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>('{}');

  const getDataSource = useCallback(async (id) => {
    const data = await canvasIndexeddbStorage.getCanvas(id);
    data && setDataSource(data);
  }, []);

  const onChange = useCallback((data) => {
    console.log('--- onchange ---', data);
  }, []);

  useEffect(() => {
    getDataSource(file.id);
  }, [file.id]);

  return <ExcalidrawApp dataSource={dataSource} canvasName={file.name} onChange={onChange} />;
}
