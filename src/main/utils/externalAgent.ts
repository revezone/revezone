import { spawn } from 'node:child_process';
import { accessSync, constants, readdirSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, open, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';
import { createInterface } from 'node:readline';
import type { ExternalModelBackend } from '../../shared/modelConfig';
import { runCodexStream } from './codexStream';

const MAX_INPUT_BYTES = 256 * 1024;
const MAX_SCHEMA_BYTES = 32 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_CLAUDE_SETTINGS_BYTES = 64 * 1024;
const TIMEOUT_MS = 90_000;
const SYSTEM_PROMPT =
  'You are the Revezone text model. Answer using only the supplied input. Return the requested JSON object.';
const BACKENDS = {
  codex: { label: 'Codex CLI', name: 'codex', login: 'codex login' },
  claude: { label: 'Claude Code', name: 'claude', login: 'claude auth login' }
};
const CODEX_PERMISSION_PROFILE = 'revezone';
const CODEX_DISABLED_FEATURES = [
  'shell_tool',
  'shell_snapshot',
  'unified_exec',
  'hooks',
  'plugins',
  'apps',
  'multi_agent',
  'multi_agent_v2',
  'memories',
  'goals',
  'in_app_browser',
  'browser_use',
  'browser_use_external',
  'skill_search',
  'skill_mcp_dependency_install'
];

function searchDirectories() {
  const home = homedir();
  const nodeVersions = join(home, '.nvm', 'versions', 'node');
  let nvm: string[] = [];
  try {
    nvm = readdirSync(nodeVersions)
      .filter((name) => /^v\d+\.\d+\.\d+$/.test(name))
      .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
      .map((name) => join(nodeVersions, name, 'bin'));
  } catch {
    // A GUI launch may run on a system without nvm.
  }
  return [
    ...new Set([
      ...(process.env.PATH ?? '').split(delimiter).filter(isAbsolute),
      join(home, '.local', 'bin'),
      join(home, '.volta', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      ...nvm
    ])
  ];
}

function locateBinary(backend: ExternalModelBackend, directories: string[]) {
  for (const directory of directories) {
    const path = join(directory, BACKENDS[backend].name);
    try {
      if (!statSync(path).isFile()) continue;
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      // Continue across PATH entries that do not contain this executable.
    }
  }
  return undefined;
}

export function hasExternalAgent(backend: ExternalModelBackend): boolean {
  return Boolean(locateBinary(backend, searchDirectories()));
}

function agentEnv(backend: ExternalModelBackend, directories: string[], cwd: string) {
  const env: NodeJS.ProcessEnv = {
    HOME: homedir(),
    PATH: directories.join(delimiter),
    TMPDIR: cwd,
    LANG: process.env.LANG ?? 'en_US.UTF-8',
    TERM: 'dumb',
    NO_COLOR: '1'
  };
  const network = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR'
  ];
  const credentials = {
    codex: ['CODEX_HOME', 'CODEX_API_KEY'],
    claude: [
      'CLAUDE_CODE_OAUTH_TOKEN',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_BASE_URL'
    ]
  };
  for (const key of [...network, ...credentials[backend]]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function claudeModelName(value: unknown): string | undefined {
  return typeof value === 'string' &&
    /^[a-z\d][a-z\d._:/-]{0,127}(?:\[[a-z\d]{1,12}\])?$/i.test(value)
    ? value
    : undefined;
}

function loopbackClaudeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 512) return undefined;
  try {
    const url = new URL(value);
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
      return url.href;
  } catch {
    // Only a well-formed, explicitly configured local gateway can be reused.
  }
  return undefined;
}

async function claudeSavedEnv() {
  try {
    const file = await open(
      join(homedir(), '.claude', 'settings.json'),
      constants.O_RDONLY | constants.O_NONBLOCK
    );
    try {
      if (!(await file.stat()).isFile()) return undefined;
      const buffer = Buffer.alloc(MAX_CLAUDE_SETTINGS_BYTES + 1);
      const { bytesRead } = await file.read(buffer);
      if (bytesRead > MAX_CLAUDE_SETTINGS_BYTES) return undefined;
      return (
        JSON.parse(buffer.toString('utf8', 0, bytesRead)) as { env?: Record<string, unknown> }
      ).env;
    } finally {
      await file.close();
    }
  } catch {
    return undefined;
  }
}

async function configureClaudeEnv(env: NodeJS.ProcessEnv) {
  const explicitModel = claudeModelName(process.env.ANTHROPIC_MODEL);
  if (explicitModel) env.ANTHROPIC_MODEL = explicitModel;
  const explicitRoute =
    env.ANTHROPIC_BASE_URL ||
    env.ANTHROPIC_AUTH_TOKEN ||
    env.ANTHROPIC_API_KEY ||
    env.CLAUDE_CODE_OAUTH_TOKEN;
  if (explicitRoute && explicitModel) return;

  // Finder does not inherit terminal exports. Reuse only an already configured local route and its own token.
  const saved = await claudeSavedEnv();
  const url = loopbackClaudeUrl(saved?.ANTHROPIC_BASE_URL);
  const token = saved?.ANTHROPIC_AUTH_TOKEN;
  if (!url || typeof token !== 'string' || token.length > 4096 || !/^\S+$/.test(token)) return;
  if (explicitRoute) {
    if (loopbackClaudeUrl(env.ANTHROPIC_BASE_URL) !== url || env.ANTHROPIC_AUTH_TOKEN !== token) {
      return;
    }
  } else {
    env.ANTHROPIC_BASE_URL = url;
    env.ANTHROPIC_AUTH_TOKEN = token;
  }
  const savedModel = claudeModelName(saved?.ANTHROPIC_MODEL);
  if (!explicitModel && savedModel) env.ANTHROPIC_MODEL = savedModel;
}

function cliFailure(backend: ExternalModelBackend, diagnostic: string) {
  const { label, login } = BACKENDS[backend];
  if (
    /unknown (?:option|argument)|unexpected argument|unrecognized (?:option|argument)/i.test(
      diagnostic
    )
  ) {
    return new Error(`${label} 版本不支持当前运行参数，请更新后重试。`);
  }
  if (
    /not logged in|login required|unauthorized|authentication failed|invalid (?:api key|token)|\b401\b/i.test(
      diagnostic
    )
  ) {
    return new Error(`${label} 登录不可用，请在终端运行 ${login} 后重试。`);
  }
  if (/\b429\b|quota|rate limit|credit balance/i.test(diagnostic)) {
    return new Error(`${label} 当前触发额度或频率限制，请查看 CLI 的账户状态。`);
  }
  return new Error(`${label} 请求失败，请检查 CLI 的登录状态和网络连接。`);
}

type CliEvent = Record<string, unknown>;

function asRecord(value: unknown): CliEvent | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as CliEvent)
    : undefined;
}

function runProcess(
  backend: ExternalModelBackend,
  binary: string,
  args: string[],
  input: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  signal: AbortSignal,
  onEvent?: (event: CliEvent) => void
): Promise<string> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== 'win32';
    const child = spawn(binary, args, {
      cwd,
      env,
      shell: false,
      detached: grouped,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    const stdout: Buffer[] = [];
    let stderr = '';
    let size = 0;
    let failure: unknown;

    function stop(reason: unknown) {
      if (failure) return;
      failure = reason;
      if (!child.pid) return;
      try {
        if (grouped) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        // The process may have already exited.
      }
    }

    const abort = () => stop(signal.reason ?? new Error('CLI 请求已取消。'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();

    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        stop(new Error('CLI 输出超出长度限制。'));
      } else {
        stdout.push(chunk);
      }
    });
    if (onEvent) {
      createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', (line) => {
        if (failure) return;
        let event: CliEvent | undefined;
        try {
          event = asRecord(JSON.parse(line));
        } catch {
          // Ignore lines outside the CLI event protocol.
        }
        if (event) onEvent(event);
      });
    }
    child.stderr.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) stop(new Error('CLI 输出超出长度限制。'));
      stderr = (stderr + chunk.toString()).slice(-8192);
    });
    child.stdin.on('error', () => {
      // A CLI that exits before reading stdin reports the failure on close.
    });
    child.on('error', () => stop(new Error(`无法启动 ${BACKENDS[backend].label}。`)));
    child.on('close', (code) => {
      signal.removeEventListener('abort', abort);
      const output = Buffer.concat(stdout).toString('utf8');
      if (failure) reject(failure);
      else if (code !== 0) reject(cliFailure(backend, stderr + output.slice(-8192)));
      else resolve(output);
    });
    child.stdin.end(input);
  });
}

function objectOutput(backend: ExternalModelBackend, value: unknown): Record<string, unknown> {
  let output = value;
  if (typeof output === 'string') {
    try {
      output = JSON.parse(output.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
    } catch {
      throw new Error(`${BACKENDS[backend].label} 未返回有效的 JSON 对象。`);
    }
  }
  const parsed = asRecord(output);
  if (!parsed) throw new Error(`${BACKENDS[backend].label} 未返回有效的 JSON 对象。`);
  return parsed;
}

function claudeStream(emit: (text: string) => void) {
  let result: CliEvent | undefined;
  let block: { index: number; type: 'text' | 'structured'; text: string } | undefined;
  let sawStructured = false;
  let emittedStructured = false;

  function receive(event: CliEvent) {
    if (event.parent_tool_use_id) return;
    if (event.type === 'result') {
      result = event;
      return;
    }
    if (event.type === 'assistant' && !emittedStructured) {
      const content = asRecord(event.message)?.content;
      if (Array.isArray(content)) {
        const input = content.find(
          (item) => item?.type === 'tool_use' && item.name === 'StructuredOutput'
        )?.input;
        if (asRecord(input)) {
          sawStructured = true;
          emittedStructured = true;
          emit(JSON.stringify(input));
        }
      }
      return;
    }
    if (event.type !== 'stream_event') return;
    const part = asRecord(event.event);
    if (!part) return;
    if (part.type === 'message_start' || part.type === 'message_stop') block = undefined;
    if (typeof part.index !== 'number') return;

    if (part.type === 'content_block_start') {
      const start = asRecord(part.content_block);
      if (start?.type === 'tool_use' && start.name === 'StructuredOutput') {
        sawStructured = true;
        block = { index: part.index, type: 'structured', text: '' };
      } else if (start?.type === 'text' && !sawStructured) {
        block = { index: part.index, type: 'text', text: '' };
      }
      return;
    }
    if (!block || part.index !== block.index) return;
    if (part.type === 'content_block_stop') block = undefined;
    if (!block || part.type !== 'content_block_delta') return;
    const delta = asRecord(part.delta);
    const fragment =
      block.type === 'structured' && delta?.type === 'input_json_delta'
        ? delta.partial_json
        : block.type === 'text' && delta?.type === 'text_delta'
        ? delta.text
        : undefined;
    if (typeof fragment !== 'string' || !fragment) return;
    block.text += fragment;
    if (/^\s*\{/.test(block.text)) {
      if (block.type === 'structured') emittedStructured = true;
      emit(block.text);
    }
  }

  return {
    receive,
    get result() {
      return result;
    }
  };
}

async function prepareCodexHome(env: NodeJS.ProcessEnv, workDir: string) {
  const loginHome = env.CODEX_HOME || join(homedir(), '.codex');
  const apiKey = env.CODEX_API_KEY;
  const cliHome = join(workDir, 'codex');
  await mkdir(cliHome, { mode: 0o700 });
  if (!apiKey) {
    const authFile = isAbsolute(loginHome)
      ? await realpath(join(loginHome, 'auth.json')).catch(() => undefined)
      : undefined;
    const info = authFile ? await stat(authFile).catch(() => undefined) : undefined;
    if (
      !authFile ||
      !info?.isFile() ||
      (process.getuid && (info.uid !== process.getuid() || (info.mode & 0o077) !== 0))
    ) {
      throw new Error('Codex 流式对话需要 Codex CLI 的文件登录或 CODEX_API_KEY。');
    }
    // Let Codex manage its own tokens and refreshes without loading the user's config.
    await symlink(authFile, join(cliHome, 'auth.json'), 'file');
  }
  env.CODEX_HOME = cliHome;
  delete env.CODEX_API_KEY;
  return apiKey;
}

export async function runExternalAgent(
  backend: ExternalModelBackend,
  prompt: string,
  schema: object,
  signal: AbortSignal,
  onContent?: (text: string) => void
): Promise<string> {
  signal.throwIfAborted();
  const schemaJson = JSON.stringify(schema);
  if (
    Buffer.byteLength(prompt) > MAX_INPUT_BYTES ||
    Buffer.byteLength(schemaJson) > MAX_SCHEMA_BYTES
  ) {
    throw new Error('CLI 请求超出长度限制。');
  }
  const directories = searchDirectories();
  const binary = locateBinary(backend, directories);
  if (!binary) throw new Error(`未找到 ${BACKENDS[backend].label}，请先安装并在终端登录。`);

  const cwd = await mkdtemp(join(tmpdir(), 'revezone-model-'));
  const env = agentEnv(backend, directories, cwd);
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timeout = setTimeout(() => controller.abort(new Error('CLI 请求超时。')), TIMEOUT_MS);
  const run = (args: string[], input: string, onEvent?: (event: CliEvent) => void) =>
    runProcess(backend, binary, args, input, cwd, env, controller.signal, onEvent);
  let lastContent: string | undefined;
  const emit = (text: string) => {
    if (!onContent || controller.signal.aborted || text === lastContent) return;
    lastContent = text;
    try {
      onContent(text);
    } catch {
      // The subscriber can disappear while the CLI is still running.
    }
  };
  try {
    if (backend === 'claude') await configureClaudeEnv(env);
    if (backend === 'codex') {
      const apiKey = await prepareCodexHome(env, cwd);
      const requestDir = join(cwd, 'request');
      await mkdir(requestDir, { mode: 0o700 });
      const output = await runCodexStream({
        binary,
        args: [
          '--no-daemon',
          'app-server',
          '--stdio',
          '--strict-config',
          ...CODEX_DISABLED_FEATURES.flatMap((feature) => ['--disable', feature]),
          '--enable',
          'skip_host_skill_discovery',
          '-c',
          'web_search="disabled"',
          '-c',
          'project_doc_max_bytes=0',
          '-c',
          `default_permissions="${CODEX_PERMISSION_PROFILE}"`,
          '-c',
          `permissions.${CODEX_PERMISSION_PROFILE}.filesystem={":minimal"="read"}`,
          '-c',
          `permissions.${CODEX_PERMISSION_PROFILE}.network.enabled=false`,
          '-c',
          'shell_environment_policy.inherit="none"',
          '-c',
          'model_reasoning_effort="low"',
          '-c',
          `cli_auth_credentials_store="${apiKey ? 'ephemeral' : 'file'}"`
        ],
        cwd: await realpath(requestDir),
        env,
        apiKey,
        prompt: SYSTEM_PROMPT + '\n\n' + prompt,
        schema,
        signal: controller.signal,
        permissionProfile: CODEX_PERMISSION_PROFILE,
        onContent: onContent ? emit : undefined
      });
      return JSON.stringify(objectOutput(backend, output));
    }

    const mcpPath = join(cwd, 'mcp.json');
    await writeFile(mcpPath, '{"mcpServers":{}}', { mode: 0o600 });
    const args = [
      '--print',
      '--output-format',
      onContent ? 'stream-json' : 'json',
      ...(onContent ? ['--verbose', '--include-partial-messages'] : []),
      '--tools',
      '',
      '--strict-mcp-config',
      '--mcp-config',
      mcpPath,
      '--setting-sources',
      '',
      '--permission-mode',
      'default',
      '--no-session-persistence',
      '--system-prompt',
      SYSTEM_PROMPT,
      '--safe-mode',
      '--disable-slash-commands',
      '--no-chrome',
      '--json-schema',
      schemaJson
    ];
    const stream = onContent ? claudeStream(emit) : undefined;
    const output = await run(args, prompt, stream?.receive);
    const response = stream ? stream.result : objectOutput(backend, output);
    if (!response) throw new Error('Claude Code 未返回结束事件。');
    if (response.is_error === true || (stream && response.subtype !== 'success')) {
      throw cliFailure(backend, String(response.result ?? ''));
    }
    const final = JSON.stringify(
      objectOutput(backend, response.structured_output ?? response.result)
    );
    emit(final);
    return final;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
    await rm(cwd, { force: true, recursive: true });
  }
}
