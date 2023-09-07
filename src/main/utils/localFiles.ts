import { app } from 'electron';
import fs from 'node:fs';
import { ensureDir, USER_DATA_PATH } from './io';

export function onFileDataChange(
  fileId: string,
  fileType: 'board' | 'note',
  fileName: string,
  value: string
) {
  console.log('--- fileDataChange ---', fileId, fileType, fileName, value);

  const dir = `${USER_DATA_PATH}/user_files/${fileType}`;

  ensureDir(dir);

  const suffix = fileType === 'board' ? '.excalidraw' : '.md';
  const filePath = `${dir}/${fileName}_${fileId}${suffix}`;

  fs.writeFileSync(filePath, value);
}
