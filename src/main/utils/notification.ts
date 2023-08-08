import { Notification } from 'electron';

export const notify = (message: string) => {
  return new Notification({ title: message }).show();
};
