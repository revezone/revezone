import type { VersionHistoryBridge } from '../shared/versionHistory';
import type { AiBridge } from '../shared/ai';
import type { CommunityBridge } from '../shared/community';
import type { ModelConfigBridge } from '../shared/modelConfig';
import type { NoteAssetsBridge } from '../shared/noteAssets';

declare global {
  interface Window {
    electron?: {
      process: {
        env: Partial<
          Record<
            | 'USER_FILES_STORAGE_PATH'
            | 'DEEP_LINKING_URL'
            | 'OPEN_FILE_PATH'
            | 'OPEN_FILE_DATA'
            | 'registeredFonts',
            string
          >
        >;
        versions: Partial<Record<'electron' | 'chrome' | 'node' | 'v8', string>>;
      };
    };
    api: typeof import('./index').api;
    versionHistory?: VersionHistoryBridge;
    noteAssets?: NoteAssetsBridge;
    revezoneAi?: AiBridge;
    communitySearch?: CommunityBridge;
    revezoneModel?: ModelConfigBridge;
  }
}
