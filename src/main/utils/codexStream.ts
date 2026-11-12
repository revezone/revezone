import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const STARTUP_TIMEOUT_MS = 15_000;
const TURN_TIMEOUT_MS = 90_000;
const SHUTDOWN_TIMEOUT_MS = 500;
const MAX_PROTOCOL_BYTES = 4 * 1024 * 1024;
const MAX_ANSWER_BYTES = 1024 * 1024;
const MAX_PROMPT_BYTES = 256 * 1024;
const MAX_SCHEMA_BYTES = 32 * 1024;
const TEXT_ITEMS = new Set(['userMessage', 'agentMessage', 'reasoning']);

type ProtocolObject = Record<string, unknown>;

type CodexStreamOptions = {
  binary: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  prompt: string;
  schema: object;
  signal: AbortSignal;
  permissionProfile: string;
  apiKey?: string;
  onContent?: (text: string) => void;
};

function asObject(value: unknown): ProtocolObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ProtocolObject)
    : undefined;
}

function isAnswer(text: unknown): text is string {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_ANSWER_BYTES) return false;
  try {
    return Boolean(asObject(JSON.parse(text)));
  } catch {
    return false;
  }
}

function answerPhase(phase: unknown) {
  if (phase === 'final_answer') return 'final';
  if (phase == null) return 'unknown';
  return undefined;
}

export async function runCodexStream(options: CodexStreamOptions): Promise<string> {
  const { binary, args, env, cwd, prompt, schema, signal, permissionProfile, apiKey, onContent } =
    options;
  signal.throwIfAborted();
  if (
    !permissionProfile ||
    (apiKey !== undefined && (!apiKey || Buffer.byteLength(apiKey) > 4096)) ||
    Buffer.byteLength(prompt) > MAX_PROMPT_BYTES ||
    Buffer.byteLength(JSON.stringify(schema)) > MAX_SCHEMA_BYTES
  ) {
    throw new Error('Codex 流式请求配置或长度无效。');
  }
  const canonicalCwd = await realpath(cwd).catch(() => {
    throw new Error('Codex 隔离目录不可用。');
  });
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
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const activeMessages = new Map<
      string,
      { phase: 'final' | 'unknown'; text: string; bytes: number; json?: boolean }
    >();
    let size = 0;
    let stage: 1 | 2 | 3 | 4 | 5 = 1;
    let promptSent = false;
    let threadId: string | undefined;
    let turnId: string | undefined;
    let sawFinal = false;
    let finalText: string | undefined;
    let unknownText: string | undefined;
    let lastEmitted: string | undefined;
    let outcome: { text: string } | { error: unknown } | undefined;
    let shutdown: NodeJS.Timeout | undefined;

    function kill() {
      if (!child.pid) return;
      try {
        if (grouped) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        // The subprocess may already have exited.
      }
    }

    function finish(result: { text: string } | { error: unknown }) {
      if (outcome) return;
      outcome = result;
      clearTimeout(startupTimer);
      clearTimeout(turnTimer);
      if ('error' in result) kill();
      else {
        child.stdin.end();
        shutdown = setTimeout(kill, SHUTDOWN_TIMEOUT_MS);
      }
    }

    function fail(message: string) {
      finish({ error: new Error(message) });
    }

    function send(message: ProtocolObject) {
      child.stdin.write(JSON.stringify(message) + '\n');
    }

    function startThread() {
      stage = 3;
      send({
        id: 3,
        method: 'thread/start',
        params: {
          cwd: canonicalCwd,
          runtimeWorkspaceRoots: [canonicalCwd],
          environments: [],
          dynamicTools: [],
          ephemeral: true,
          approvalPolicy: 'never',
          permissions: permissionProfile
        }
      });
    }

    function emit(text: string) {
      if (!onContent || signal.aborted || text === lastEmitted) return;
      lastEmitted = text;
      try {
        onContent(text);
      } catch {
        // A preview subscriber can disappear while the turn is running.
      }
    }

    function acceptCompletedItem(item: ProtocolObject) {
      const phase = answerPhase(item.phase);
      if (!phase) return;
      if (phase === 'final') {
        sawFinal = true;
        finalText = isAnswer(item.text) ? item.text : undefined;
      } else if (isAnswer(item.text)) {
        unknownText = item.text;
      }
    }

    function acceptTextItem(value: unknown) {
      const item = asObject(value);
      if (
        typeof item?.id !== 'string' ||
        typeof item.type !== 'string' ||
        !TEXT_ITEMS.has(item.type)
      ) {
        fail('Codex 返回了未经授权的会话项目。');
        return undefined;
      }
      return item as ProtocolObject & { id: string; type: string };
    }

    function receiveNotification(method: string, params: ProtocolObject) {
      if (!promptSent || params.threadId !== threadId) return;
      const turn = asObject(params.turn);
      if (method === 'turn/started' && typeof turn?.id === 'string') {
        if (turnId && turnId !== turn.id) fail('Codex 返回了意外的会话轮次。');
        else turnId = turn.id;
        return;
      }
      if (!turnId || (params.turnId ?? turn?.id) !== turnId) return;

      if (method === 'turn/completed') {
        if (turn?.status !== 'completed' || turn.error) {
          fail('Codex 未能完成当前请求。');
          return;
        }
        if (Array.isArray(turn.items)) {
          for (const entry of turn.items) {
            const item = acceptTextItem(entry);
            if (!item) return;
            if (item.type === 'agentMessage') acceptCompletedItem(item);
          }
        }
        const text = sawFinal ? finalText : unknownText;
        if (!text) fail('Codex 未返回有效的 JSON 对象。');
        else {
          emit(text);
          finish({ text });
        }
        return;
      }

      if (method === 'item/started' || method === 'item/completed') {
        const item = acceptTextItem(params.item);
        if (item?.type !== 'agentMessage') return;
        if (method === 'item/completed') {
          activeMessages.delete(item.id);
          acceptCompletedItem(item);
        } else {
          const phase = answerPhase(item.phase);
          if (phase) activeMessages.set(item.id, { phase, text: '', bytes: 0 });
          if (phase === 'final') sawFinal = true;
        }
        return;
      }

      if (method !== 'item/agentMessage/delta' || typeof params.itemId !== 'string') return;
      const message = activeMessages.get(params.itemId);
      if (!message || typeof params.delta !== 'string') return;
      if (message.json === false || (message.phase === 'unknown' && sawFinal)) return;
      const first = params.delta.trimStart()[0];
      if (message.json === undefined && first) message.json = first === '{';
      if (message.json === false) return;
      message.bytes += Buffer.byteLength(params.delta);
      message.text += params.delta;
      if (message.bytes > MAX_ANSWER_BYTES) {
        fail('Codex 输出超出长度限制。');
      } else if (message.json) {
        emit(message.text);
      }
    }

    function receiveReply(message: ProtocolObject) {
      if (message.id !== stage || stage === 5) return;
      const result = asObject(message.result);
      if (!result || message.error) {
        fail(promptSent ? 'Codex 未能启动当前请求。' : 'Codex 无法建立隔离的流式会话。');
        return;
      }
      if (stage === 1) {
        send({ method: 'initialized' });
        if (apiKey) {
          stage = 2;
          send({ id: 2, method: 'account/login/start', params: { type: 'apiKey', apiKey } });
        } else startThread();
        return;
      }
      if (stage === 2) {
        if (result.type !== 'apiKey') fail('Codex 未能使用 API 密钥登录。');
        else startThread();
        return;
      }
      if (stage === 3) {
        const thread = asObject(result.thread);
        const sandbox = asObject(result.sandbox);
        const profile = asObject(result.activePermissionProfile);
        if (
          !thread ||
          typeof thread.id !== 'string' ||
          thread.ephemeral !== true ||
          thread.path !== null ||
          result.cwd !== canonicalCwd ||
          thread.cwd !== canonicalCwd ||
          !Array.isArray(result.runtimeWorkspaceRoots) ||
          result.runtimeWorkspaceRoots.some((root) => root !== canonicalCwd) ||
          !Array.isArray(result.instructionSources) ||
          result.instructionSources.length !== 0 ||
          result.approvalPolicy !== 'never' ||
          sandbox?.type !== 'readOnly' ||
          sandbox.networkAccess !== false ||
          profile?.id !== permissionProfile ||
          profile.extends !== null
        ) {
          fail('Codex 未确认要求的隔离权限。');
          return;
        }
        threadId = thread.id;
        stage = 4;
        clearTimeout(startupTimer);
        promptSent = true;
        send({
          id: 4,
          method: 'turn/start',
          params: {
            threadId,
            cwd: canonicalCwd,
            runtimeWorkspaceRoots: [canonicalCwd],
            environments: [],
            input: [{ type: 'text', text: prompt, text_elements: [] }],
            approvalPolicy: 'never',
            permissions: permissionProfile,
            outputSchema: schema
          }
        });
        return;
      }
      const turn = asObject(result.turn);
      if (typeof turn?.id !== 'string' || (turnId && turnId !== turn.id)) {
        fail('Codex 返回了意外的会话轮次。');
        return;
      }
      turnId = turn.id;
      stage = 5;
    }

    function measure(chunk: Buffer) {
      size += chunk.length;
      if (size > MAX_PROTOCOL_BYTES) fail('Codex 协议输出超出长度限制。');
    }

    // Keep stream framing separate from the response and never expose diagnostics or reasoning.
    child.stdout.prependListener('data', measure);
    child.stderr.on('data', measure);
    lines.on('line', (line) => {
      if (outcome) return;
      let message: ProtocolObject | undefined;
      try {
        message = asObject(JSON.parse(line));
      } catch {
        fail('Codex 返回了无法识别的流式协议消息。');
        return;
      }
      if (!message) return;
      if (typeof message.method === 'string') {
        if ('id' in message) fail('Codex 请求了未授权的操作。');
        else {
          const params = asObject(message.params);
          if (params) receiveNotification(message.method, params);
        }
      } else receiveReply(message);
    });

    const abort = () => finish({ error: signal.reason ?? new Error('Codex 请求已取消。') });
    const startupTimer = setTimeout(() => fail('Codex 隔离会话启动超时。'), STARTUP_TIMEOUT_MS);
    const turnTimer = setTimeout(() => fail('Codex 请求超时。'), TURN_TIMEOUT_MS);
    signal.addEventListener('abort', abort, { once: true });
    child.stdin.on('error', () => fail('无法向 Codex 发送请求。'));
    child.on('error', () => fail('无法启动 Codex 流式会话。'));
    child.on('close', () => {
      clearTimeout(startupTimer);
      clearTimeout(turnTimer);
      if (shutdown) clearTimeout(shutdown);
      signal.removeEventListener('abort', abort);
      lines.close();
      if (!outcome) reject(new Error('Codex 流式会话提前结束。'));
      else if ('error' in outcome) reject(outcome.error);
      else resolve(outcome.text);
    });
    if (signal.aborted) abort();
    else {
      send({
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: { name: 'revezone', title: 'Revezone', version: '1.0.0' },
          capabilities: {
            experimentalApi: true,
            requestAttestation: false,
            explicitGatewayOauth: true
          }
        }
      });
    }
  });
}
