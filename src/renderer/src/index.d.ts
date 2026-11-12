declare interface Window {
  showOpenFilePicker: (options?: {
    multiple: boolean;
    excludeAcceptAllOption: boolean;
    types: { description: string; accept: object }[];
  }) => any;
}
