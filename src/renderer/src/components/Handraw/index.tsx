import { ExcalidrawApp } from 'handraw-materials';
import {
  ExcalidrawDataSource,
  NonDeletedExcalidrawElement
} from 'handraw-materials/es/ExcalidrawApp/types';

export default function Handraw({ pageId }: { pageId: string | undefined }) {
  return <ExcalidrawApp dataSource="{}" canvasName={''} onChange={() => {}} />;
}
