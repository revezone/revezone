import { EventName } from '@renderer/types/statistics';
import { isInRevezoneApp, osName } from '@renderer/utils/navigator';
import { reveGTag } from './reveGTag';

export const submiteUserEvent = (eventName: EventName, data) => {
  console.log('submiteUserEvent', eventName);

  // window._hmt.push(['_trackEvent', 'all', eventName, JSON.stringify(data)]);

  if (isInRevezoneApp) {
    console.log('--- window.api ---', window.api);
    reveGTag.event(eventName, data);
    // window.api?.submiteUserEvent(eventName);
  } else {
    window.gtag('event', eventName, data);
  }
};

export const submiteAppEnterUserEvent = () => {
  try {
    if (isInRevezoneApp) {
      const { npm_package_version, USER } = window.electron.process.env;
      submiteUserEvent('enter_app', { appVersion: npm_package_version, user: USER, osName });
    }
  } catch (err) {
    console.log(err);
  }
};
