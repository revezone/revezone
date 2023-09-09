import { app } from 'electron';
import fs from 'node:fs';
import { ensureDir, USER_DATA_PATH } from './io';
import { getLocalFilesStoragePath } from './customStoragePath';

export function onFileDataChange(
  fileId: string,
  fileType: 'board' | 'note',
  fileName: string,
  value: string
) {
  const userFilesStoragePath = getLocalFilesStoragePath();

  const dir = `${userFilesStoragePath}/${fileType}`;

  console.log('--- fileDataChange ---', fileId, fileType, fileName, dir);

  ensureDir(dir);

  const suffix = fileType === 'board' ? '.excalidraw' : '.md';
  const filePath = `${dir}/${fileName}_${fileId}${suffix}`;

  fs.writeFileSync(filePath, value);
}
