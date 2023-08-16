import { EventName } from '@renderer/types/statistics';
import { isInRevezoneApp } from '@renderer/utils/navigator';
import { reveGTag } from './reveGTag';

export const submitUserEvent = (eventName: EventName, data) => {
  if (isInRevezoneApp) {
    reveGTag.event(eventName, data);
  } else {
    window.gtag('event', eventName, data);
  }
};

export const submitAppEnterUserEvent = () => {
  try {
    if (isInRevezoneApp) {
      submitUserEvent('enter_app', {});
    }
  } catch (err) {
    console.log(err);
  }
};
