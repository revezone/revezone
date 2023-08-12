import { osName, appVersion } from './navigator';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_ANALYTICS_URL = 'https://google-analytics.com/g/collect';
// const GOOGLE_ANALYTICS_URL = 'https://fenav.top/api/collect';
// const GOOGLE_ANALYTICS_URL = 'http://192.168.3.2:3000/api/collect';
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

    const ep = {};
    Object.keys(data).forEach((key) => {
      ep[`ep.${key}`] = data[key];
    });

    // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters?hl=zh-cn
    const payload = new URLSearchParams({
      v: '2',
      t: 'event',
      tid: this.tid,
      cid: clientId,
      gtm: clientId,
      sid: clientId,
      _p: clientId,
      dl: 'https://revenote.app',
      dr: 'https://revenote.app',
      dt: document.title,
      ds: 'app',
      en: eventName,
      ul: navigator.language,
      sr: `${screen.width}x${screen.height}`,
      uap: osName,
      uapv: appVersion,
      uafvl: navigator.userAgent,
      aip: '0',
      sct: '32',
      seg: '1',
      ...ep
    });

    const res = await axios.post(GOOGLE_ANALYTICS_URL, '', {
      params: payload,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });

    console.log('--- res ---', res.status, res.data, res.config);

    // @ts-ignore TEST
    window.res = res;
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

const GOOGLE_ANALYTICS_TID = 'G-DEMH5X5XXQ';

export const reveGTag = new ReveGTag(GOOGLE_ANALYTICS_TID);
