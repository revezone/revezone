export const MODEL_CHANNELS = {
  get: 'revezone:model:get',
  save: 'revezone:model:save',
  test: 'revezone:model:test'
} as const;

export type ModelBackend = 'builtin' | 'codex' | 'claude';
export type ExternalModelBackend = Exclude<ModelBackend, 'builtin'>;

export type ModelSettings = {
  backend: ModelBackend;
  baseUrl: string;
  model: string;
  local: boolean;
  source: 'default' | 'env' | 'saved';
  hasApiKey: boolean;
  keySource?: 'env' | 'saved';
  keyStorageAvailable: boolean;
};

export type ModelSettingsInput = {
  backend?: ModelBackend;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  clearApiKey?: boolean;
};

export type ModelTestResult = { model: string; latencyMs: number };

export interface ModelConfigBridge {
  get(): Promise<ModelSettings>;
  save(input: ModelSettingsInput): Promise<ModelSettings>;
  test(input: ModelSettingsInput): Promise<ModelTestResult>;
}
