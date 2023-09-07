import { app } from 'electron';

import fs from 'node:fs';

export const USER_DATA_PATH = app.getPath('userData');

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
