import { machineIdSync } from 'node-machine-id';
import { v4 as uuidv4 } from 'uuid';
import ga4 from 'electron-google-analytics4';
import axios from 'axios';

// @ts-ignore
const Analytics = ga4.default;
const GOOGLE_ANALYTICS_TID = 'G-DEMH5X5XXQ';
const MEASUREMENT_PROTOCAL_SECRET = 'NUJCMdJGTbqx7S0zRaOC4w';
const clientId = machineIdSync();
const sessionId = uuidv4();
const userId = clientId;

console.log('--- Analytics ---', Analytics);

const analytics = new Analytics(
  GOOGLE_ANALYTICS_TID,
  MEASUREMENT_PROTOCAL_SECRET,
  clientId,
  sessionId
);

analytics.setUserProperties({ userId });

export const gtag = async (eventName: string) => {
  console.log('--- gtag start ---');

  const res2 = await axios.get('https://google-analytics.com/g/collect');
  console.log('--- res2 ---', res2);

  const res = await analytics.event(eventName);
  console.log('--- gtag res ---', res);
};
