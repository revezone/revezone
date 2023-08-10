import { osName, appVersion } from './navigator';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_ANALYTICS_URL = 'https://google-analytics.com/g/collect';
const LOCALSTORAGE_USER_ID_KEY = 'reve_user_id';

class ReveGTag {
  constructor(tid: string) {
    this.tid = tid;
    this.instance = this;
  }

  tid: string;
  instance: ReveGTag;

  event(eventName: string, data = {}) {
    const userId = this.getUserId();

    const ep = {};
    Object.keys(data).forEach((key) => {
      ep[`ep.${key}`] = data[key];
    });

    const payload = new URLSearchParams({
      v: '2',
      tid: this.tid,
      cid: userId,
      dl: 'https://revenote.app',
      dr: 'https://revenote.app',
      dt: document.title,
      en: eventName,
      ul: navigator.language,
      sr: `${screen.width}x${screen.height}`,
      uap: osName,
      uapv: appVersion,
      ...ep
    });

    axios.post(GOOGLE_ANALYTICS_URL, '', {
      params: payload,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }

  getUserId(): string {
    const userIdFromLocal = localStorage.getItem(LOCALSTORAGE_USER_ID_KEY);
    const userId: string = userIdFromLocal || uuidv4();

    if (!userIdFromLocal) {
      localStorage.setItem(LOCALSTORAGE_USER_ID_KEY, userId);
    }

    return userId;
  }
}

const GOOGLE_ANALYTICS_TID = 'G-DEMH5X5XXQ';

export const reveGTag = new ReveGTag(GOOGLE_ANALYTICS_TID);
