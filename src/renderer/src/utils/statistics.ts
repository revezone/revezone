import { submiteUserEvent } from '../statistics';

export const submiteAppEnterUserEvent = () => {
  try {
    const { npm_package_version, USER } = window.electron.process.env;
    submiteUserEvent('enter_app', { app_version: npm_package_version, user: USER });
  } catch (err) {
    console.log(err);
  }
};
