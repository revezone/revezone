import { osName, appVersion } from './navigator';
import { nanoid } from 'nanoid';

const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com/mp/collect';

const LOCALSTORAGE_CLIENT_ID_KEY = 'reve_client_id';

class ReveGTag {
  constructor() {
    this.instance = this;
  }

  instance: ReveGTag;

  async event(eventName: string, data = {}) {
    const clientId = this.getClientId();

    const measurement_id = `G-DEMH5X5XXQ`;
    const api_secret = `NUJCMdJGTbqx7S0zRaOC4w`;
    const { USER, ipAddresses } = window.electron.process.env;

    return await fetch(
      `${GOOGLE_ANALYTICS_URL}?measurement_id=${measurement_id}&api_secret=${api_secret}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          user_id: 'user_' + clientId,
          events: [
            {
              name: eventName,
              params: {
                engagement_time_msec: '100',
                session_id: clientId,
                osName,
                appVersion,
                uip: ipAddresses,
                userName: USER,
                ...data
              }
            }
          ]
        })
      }
    ).then((res) => res);
  }

  getClientId(): string {
    const clientIdFromLocal = localStorage.getItem(LOCALSTORAGE_CLIENT_ID_KEY);
    const clientId: string = clientIdFromLocal || nanoid();

    if (!clientIdFromLocal) {
      localStorage.setItem(LOCALSTORAGE_CLIENT_ID_KEY, clientId);
    }

    return clientId;
  }
}

export const reveGTag = new ReveGTag();
