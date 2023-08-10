import { EventName } from '@renderer/types/statistics';
import { reveGTag } from './reveGTag';

export const submiteUserEvent = (eventName: EventName, data) => {
  console.log('submiteUserEvent', eventName);

  //   window.gtag('event', eventName, data);
  reveGTag.event(eventName, data);
};

export const submiteAppEnterUserEvent = () => {
  try {
    const { npm_package_version, USER } = window.electron.process.env;
    submiteUserEvent('enter_app', { app_version: npm_package_version, user: USER });
  } catch (err) {
    console.log(err);
  }
};
