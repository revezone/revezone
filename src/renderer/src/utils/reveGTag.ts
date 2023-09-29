import { commonIndexeddbStorage } from '@renderer/store/commonIndexeddb';
import { osName, appVersion } from './navigator';
import { nanoid } from 'nanoid';

const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com/mp/collect';

const CLIENT_ID_KEY = 'reve_client_id';

class ReveGTag {
  constructor() {
    this.instance = this;
  }

  instance: ReveGTag;

  async event(eventName: string, data = {}) {
    const clientId = await this.getClientId();

    const measurement_id = `G-DEMH5X5XXQ`;
    const api_secret = `NUJCMdJGTbqx7S0zRaOC4w`;
    const { ipAddresses, userInfo: userInfoStr } = window.electron.process.env;

    const userInfo = userInfoStr && JSON.parse(userInfoStr);

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
                ...userInfo,
                ...data
              }
            }
          ]
        })
      }
    ).then((res) => res);
  }

  async getClientId(): Promise<string> {
    const clientIdFromIndexeddb = await commonIndexeddbStorage.getCommonData(CLIENT_ID_KEY);

    const clientId: string = clientIdFromIndexeddb || nanoid();

    if (!clientIdFromIndexeddb) {
      commonIndexeddbStorage.updateCommonData(CLIENT_ID_KEY, clientId);
    }

    return clientId;
  }
}

export const reveGTag = new ReveGTag();
