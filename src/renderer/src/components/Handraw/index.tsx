import { useEffect, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { ExcalidrawApp } from 'handraw-materials';
import {
  ExcalidrawDataSource,
  NonDeletedExcalidrawElement
} from 'handraw-materials/es/ExcalidrawApp/types';

interface Props {
  file: RevenoteFile;
}

export default function Handraw({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>('{}');

  useEffect(() => {}, []);

  return <ExcalidrawApp dataSource={dataSource} canvasName={file.name} onChange={() => {}} />;
}
