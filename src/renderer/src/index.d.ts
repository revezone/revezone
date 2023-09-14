declare interface Window {
  api: { [key: string]: (param1?, param2?, param3?, param4?, param5?) => void };
  showOpenFilePicker: () => any;
}
