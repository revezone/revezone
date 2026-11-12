import { app, ipcMain, safeStorage } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { MODEL_CHANNELS } from '../../shared/modelConfig';
import type {
  ExternalModelBackend,
  ModelBackend,
  ModelSettings,
  ModelSettingsInput,
  ModelTestResult
} from '../../shared/modelConfig';
import { chatCompletion } from './agentModel';
import type { ModelConfiguration } from './agentModel';

const DEFAULT_URL = 'http://127.0.0.1:11434/v1';
const DEFAULT_MODEL = 'qwen3:4b-instruct-2507-q4_K_M';
const MAX_FILE_BYTES = 24 * 1024;
const CHECK_TOOL = 'test_connection';
const STORAGE_ERROR =
  'Secure key storage is unavailable. Unlock the system key store or use an environment API key.';

type Endpoint = Omit<ModelConfiguration, 'backend' | 'key'>;
type SavedModel = {
  version: 1;
  backend: ModelBackend;
  baseUrl: string;
  model: string;
  encryptedKey?: string | null;
};
type Credential = { source: 'env' | 'saved'; value: string };
type TestExternal = (backend: ExternalModelBackend, signal: AbortSignal) => Promise<void>;

let saveTail: Promise<unknown> = Promise.resolve();
let testing = false;

function settingsPath() {
  return join(app.getPath('userData'), 'agent-model-settings.json');
}

function endpoint(baseUrl: unknown, modelName: unknown): Endpoint {
  if (
    typeof baseUrl !== 'string' ||
    baseUrl.length > 1024 ||
    /[\s\\\p{Cc}]/u.test(baseUrl.trim())
  ) {
    throw new Error('Enter a valid model base URL.');
  }
  let address: URL;
  try {
    address = new URL(baseUrl.trim());
  } catch {
    throw new Error('Enter a valid model base URL.');
  }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname);
  if (
    (address.protocol !== 'https:' && !(local && address.protocol === 'http:')) ||
    address.username ||
    address.password ||
    address.search ||
    address.hash ||
    /[?#]/.test(baseUrl)
  ) {
    throw new Error(
      'Use an HTTPS model base URL, or HTTP for localhost, without credentials or a query.'
    );
  }
  const model = typeof modelName === 'string' ? modelName.trim() : '';
  if (!model || model.length > 200 || /\p{Cc}/u.test(model))
    throw new Error('Enter a valid model name.');
  return { url: address.href.replace(/\/+$/, ''), model, local };
}

function keyValue(input: unknown): string | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Enter a valid API key.');
  const value = input.trim();
  if (value && !/^[\x21-\x7e]+$/.test(value)) throw new Error('Enter a valid API key.');
  return value || undefined;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function modelBackend(value: unknown): ModelBackend {
  if (value === undefined || value === 'builtin') return 'builtin';
  if (value === 'codex' || value === 'claude') return value;
  throw new Error('Choose a supported model backend.');
}

function candidate(input: unknown) {
  const settings = object(input);
  if (
    !settings ||
    (settings.clearApiKey !== undefined && typeof settings.clearApiKey !== 'boolean')
  ) {
    throw new Error('Invalid model settings.');
  }
  const backend = modelBackend(settings.backend);
  if (backend !== 'builtin') return { backend } as const;
  const config = endpoint(settings.baseUrl, settings.model);
  const key = keyValue(settings.apiKey);
  if (key && settings.clearApiKey)
    throw new Error('Choose either to replace or remove the API key.');
  return { backend, config, key, clearKey: settings.clearApiKey === true } as const;
}

function environmentSettings() {
  const baseUrl = process.env.REVEZONE_AI_BASE_URL;
  const model = process.env.REVEZONE_AI_MODEL;
  const key = process.env.REVEZONE_AI_API_KEY;
  return {
    config: endpoint(baseUrl || DEFAULT_URL, model || DEFAULT_MODEL),
    source: baseUrl || model || key ? ('env' as const) : ('default' as const),
    key: keyValue(key)
  };
}

function envKeyFor(url: string) {
  try {
    const address = endpoint(process.env.REVEZONE_AI_BASE_URL || DEFAULT_URL, DEFAULT_MODEL);
    return url === address.url ? keyValue(process.env.REVEZONE_AI_API_KEY) : undefined;
  } catch {
    return undefined;
  }
}

async function readSaved(): Promise<SavedModel | undefined> {
  let bytes: Buffer;
  try {
    bytes = await readFile(settingsPath());
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw new Error('Could not read the saved model settings.');
  }
  try {
    if (bytes.length > MAX_FILE_BYTES) throw new Error();
    const value = object(JSON.parse(bytes.toString('utf8')) as unknown);
    if (value?.version !== 1) throw new Error();
    const config = endpoint(value.baseUrl, value.model);
    const encryptedKey = value.encryptedKey;
    if (
      encryptedKey !== undefined &&
      encryptedKey !== null &&
      (typeof encryptedKey !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(encryptedKey))
    )
      throw new Error();
    return {
      version: 1,
      backend: value.backend === 'qoder' ? 'builtin' : modelBackend(value.backend),
      baseUrl: config.url,
      model: config.model,
      encryptedKey
    };
  } catch {
    throw new Error(
      'The saved model settings are unreadable. Save fresh settings with a new key or explicitly clear the key.'
    );
  }
}

function isUnprotected(ciphertext: Buffer) {
  // Chromium's Linux fallback tags ciphertext encrypted with a built-in key as v10.
  return process.platform === 'linux' && ciphertext.subarray(0, 3).toString('ascii') === 'v10';
}

async function keyStorageAvailable() {
  try {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
    if (process.platform !== 'linux') return true;
    return !isUnprotected(await safeStorage.encryptStringAsync('revezone-storage-check'));
  } catch {
    return false;
  }
}

async function encryptKey(url: string, key: string) {
  try {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error();
    const ciphertext = await safeStorage.encryptStringAsync(JSON.stringify({ url, key }));
    if (isUnprotected(ciphertext)) throw new Error();
    return ciphertext.toString('base64');
  } catch {
    throw new Error(STORAGE_ERROR);
  }
}

function savedCredential(saved: SavedModel | undefined, url: string): Credential | undefined {
  if (saved?.baseUrl === url) {
    if (saved.encryptedKey === null) return undefined;
    if (saved.encryptedKey) return { source: 'saved', value: saved.encryptedKey };
  }
  const key = envKeyFor(url);
  return key ? { source: 'env', value: key } : undefined;
}

async function resolveKey(credential: Credential | undefined, url: string) {
  if (!credential || credential.source === 'env') return credential?.value;
  try {
    const ciphertext = Buffer.from(credential.value, 'base64');
    if (isUnprotected(ciphertext) || !(await safeStorage.isAsyncEncryptionAvailable()))
      throw new Error();
    const decoded = await safeStorage.decryptStringAsync(ciphertext);
    const payload = object(JSON.parse(decoded.result) as unknown);
    const key = keyValue(payload?.key);
    if (!key || payload?.url !== url) throw new Error();
    return key;
  } catch {
    throw new Error(
      'Could not unlock the saved model API key. Unlock the system key store or replace the key.'
    );
  }
}

async function publicSettings(saved: SavedModel | undefined): Promise<ModelSettings> {
  const effective = saved
    ? { config: endpoint(saved.baseUrl, saved.model), source: 'saved' as const }
    : environmentSettings();
  const { url, local, model } = effective.config;
  const credential = savedCredential(saved, url);
  return {
    backend: saved?.backend ?? 'builtin',
    baseUrl: url,
    local,
    model,
    source: effective.source,
    hasApiKey: Boolean(credential),
    keySource: credential?.source,
    keyStorageAvailable: await keyStorageAvailable()
  };
}

async function persist(saved: SavedModel) {
  const path = settingsPath();
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify(saved), 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } catch {
    throw new Error('Could not save the model settings.');
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function saveSettings(input: unknown) {
  const fields = object(input);
  const selected =
    fields?.backend !== undefined && Object.keys(fields).length === 1
      ? { backend: modelBackend(fields.backend) }
      : candidate(input);
  const operation = saveTail
    .catch(() => undefined)
    .then(async () => {
      if (!('config' in selected) || !selected.config) {
        let saved = await readSaved();
        if (!saved) {
          const { config } = environmentSettings();
          saved = { version: 1, backend: 'builtin', baseUrl: config.url, model: config.model };
        }
        saved = { ...saved, backend: selected.backend };
        await persist(saved);
        return publicSettings(saved);
      }

      const { config, key, clearKey } = selected;
      let encryptedKey: SavedModel['encryptedKey'];
      if (key) {
        encryptedKey = await encryptKey(config.url, key);
      } else if (clearKey) {
        encryptedKey = null;
      } else {
        const previous = await readSaved();
        if (previous?.baseUrl === config.url) encryptedKey = previous.encryptedKey;
      }
      const saved: SavedModel = {
        version: 1,
        backend: selected.backend,
        baseUrl: config.url,
        model: config.model,
        encryptedKey
      };
      await persist(saved);
      return publicSettings(saved);
    });
  saveTail = operation;
  return operation;
}

export async function getModelConfiguration(): Promise<ModelConfiguration> {
  const saved = await readSaved();
  if (!saved) {
    const { config, key } = environmentSettings();
    return { backend: 'builtin', ...config, key };
  }
  const config = endpoint(saved.baseUrl, saved.model);
  const key =
    saved.backend === 'builtin'
      ? await resolveKey(savedCredential(saved, config.url), config.url)
      : undefined;
  return { backend: saved.backend, ...config, key };
}

async function testSettings(input: unknown, testExternal?: TestExternal): Promise<ModelTestResult> {
  const selected = candidate(input);
  if (testing) throw new Error('A model connection test is already running.');
  testing = true;
  try {
    const signal = AbortSignal.timeout(60000);
    if (selected.backend !== 'builtin') {
      if (!testExternal) throw new Error('This Agent CLI backend is unavailable.');
      const start = performance.now();
      await testExternal(selected.backend, signal);
      return { model: selected.backend, latencyMs: Math.round(performance.now() - start) };
    }

    const { config, key, clearKey } = selected;
    const credential =
      key ??
      (clearKey
        ? undefined
        : await resolveKey(savedCredential(await readSaved(), config.url), config.url));
    const connection = { ...config, key: credential };
    const start = performance.now();
    const instruction = {
      role: 'user' as const,
      content: `Use the ${CHECK_TOOL} tool to verify the connection. The tool input is the word connected.`
    };
    const reply = await chatCompletion(connection, {
      signal,
      maxTokens: 512,
      tools: [
        {
          type: 'function',
          function: {
            name: CHECK_TOOL,
            description: 'Verify the model connection.',
            parameters: {
              type: 'object',
              properties: { value: { type: 'string', description: 'The word connected' } },
              required: ['value']
            }
          }
        }
      ],
      messages: [instruction]
    });
    const call = reply.tool_calls[0];
    const valid =
      call &&
      reply.tool_calls.every(({ function: tool }) => {
        if (tool.name !== CHECK_TOOL) return false;
        try {
          const args = object(JSON.parse(tool.arguments) as unknown);
          return !!args && args.value === 'connected' && Object.keys(args).length === 1;
        } catch {
          return false;
        }
      });
    if (!valid)
      throw new Error(
        'The model answered but did not make a valid tool call. Choose a model that supports tools.'
      );

    const confirmation = await chatCompletion(connection, {
      signal,
      maxTokens: 768,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'revezone_connection_result',
          schema: {
            type: 'object',
            properties: { connected: { type: 'boolean', enum: [true] } },
            required: ['connected'],
            additionalProperties: false
          }
        }
      },
      messages: [
        instruction,
        { role: 'assistant', content: reply.content, tool_calls: [call] },
        { role: 'tool', tool_call_id: call.id, content: '{"connected":true}' },
        { role: 'user', content: 'Return the tool result as the JSON object {"connected":true}.' }
      ]
    });
    try {
      const result = object(JSON.parse(confirmation.content ?? '') as unknown);
      if (!result || result.connected !== true || Object.keys(result).length !== 1)
        throw new Error();
    } catch {
      throw new Error(
        'The model called the tool but did not return the expected structured reply.'
      );
    }
    return { model: config.model, latencyMs: Math.round(performance.now() - start) };
  } finally {
    testing = false;
  }
}

export function registerModelConfiguration(
  assertSender: (event: IpcMainInvokeEvent) => void,
  testExternal?: TestExternal
) {
  for (const channel of Object.values(MODEL_CHANNELS)) ipcMain.removeHandler(channel);
  ipcMain.handle(MODEL_CHANNELS.get, async (event) => {
    assertSender(event);
    return publicSettings(await readSaved());
  });
  ipcMain.handle(MODEL_CHANNELS.save, (event, input: ModelSettingsInput) => {
    assertSender(event);
    return saveSettings(input);
  });
  ipcMain.handle(MODEL_CHANNELS.test, (event, input: ModelSettingsInput) => {
    assertSender(event);
    return testSettings(input, testExternal);
  });
}
