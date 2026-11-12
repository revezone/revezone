export const NOTE_ASSET_SCHEME = 'revezone-media';
export const NOTE_ASSET_URL = 'revezone-media://asset/';
export const NOTE_ASSET_CHANNELS = {
  savePath: 'revezone:note-asset:save-path',
  saveBytes: 'revezone:note-asset:save-bytes',
  has: 'revezone:note-asset:has',
  open: 'revezone:note-asset:open'
} as const;

export const MAX_INLINE_NOTE_ASSET_BYTES = 128 * 1024 * 1024;

export interface NoteAssetsBridge {
  save(file: File): Promise<string>;
  saveBytes(bytes: ArrayBuffer, mime: string): Promise<string>;
  has(url: string): Promise<boolean>;
  open(url: string, filename: string): Promise<void>;
}
