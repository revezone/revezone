import { osName, appVersion } from './navigator';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_ANALYTICS_TID = 'G-DEMH5X5XXQ';

// const GOOGLE_ANALYTICS_URL = 'https://google-analytics.com/g/collect';
// const GOOGLE_ANALYTICS_URL = 'https://fenav.top/api/collect';
// const GOOGLE_ANALYTICS_URL = 'http://192.168.3.2:3000/api/collect';
// const GOOGLE_ANALYTICS_URL = 'https://dash.deno.com/playground/strong-clam-60/g/collect';

const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com/mp/collect';

const LOCALSTORAGE_CLIENT_ID_KEY = 'reve_client_id';

class ReveGTag {
  constructor(tid: string) {
    this.tid = tid;
    this.instance = this;
  }

  tid: string;
  instance: ReveGTag;

  async event(eventName: string, data = {}) {
    const clientId = this.getClientId();

    const measurement_id = `G-DEMH5X5XXQ`;
    const api_secret = `NUJCMdJGTbqx7S0zRaOC4w`;

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
              // params: data
              params: {
                engagement_time_msec: '100',
                session_id: clientId,
                osName,
                appVersion,
                ...data
              }
            }
          ]
        })
      }
    ).then((res) => {
      console.log('--- res ---', res.status, res.url);
      return res;
    });
  }

  getClientId(): string {
    const clientIdFromLocal = localStorage.getItem(LOCALSTORAGE_CLIENT_ID_KEY);
    const clientId: string = clientIdFromLocal || uuidv4();

    if (!clientIdFromLocal) {
      localStorage.setItem(LOCALSTORAGE_CLIENT_ID_KEY, clientId);
    }

    return clientId;
  }
}

export const reveGTag = new ReveGTag(GOOGLE_ANALYTICS_TID);
