import os from 'os';

const networkInterfaces = os.networkInterfaces();

export const ipAddresses = Object.values(networkInterfaces)
  .flat()
  .filter((item) => item?.family === 'IPv4' && item?.address !== '127.0.0.1')
  .map((item) => item?.address);

process.env['ipAddresses'] = ipAddresses?.join(',');

export const userInfo = os.userInfo();

process.env['userInfo'] = JSON.stringify(userInfo);
