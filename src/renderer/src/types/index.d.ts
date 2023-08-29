declare interface Window {
  gtag: (type: string, eventName: EventName, data: object) => void;
  _hmt: { push: (item: string[]) => void };
}
