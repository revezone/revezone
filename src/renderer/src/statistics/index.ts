import { EventName } from '@renderer/types/statistics';

export const submiteUserEvent = (eventName: EventName, data) => {
  window.gtag('event', eventName, data);
};
