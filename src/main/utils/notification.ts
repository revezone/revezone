import { Notification } from 'electron';

export const notfiy = (message: string) => {
  return new Notification({ title: message }).show();
};
