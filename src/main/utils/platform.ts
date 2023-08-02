export const isMacOS = (): boolean => {
  return process.platform === 'darwin';
};

export const isWindows = (): boolean => {
  return process.platform === 'win32';
};
