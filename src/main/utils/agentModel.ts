import type { ModelBackend } from '../../shared/modelConfig';

export type ModelConfiguration = {
  backend: ModelBackend;
  url: string;
  local: boolean;
  model: string;
  key?: string;
};

export type ModelToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ModelMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | null; tool_calls?: ModelToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

type ModelTool = {
  type: 'function';
  function: { name: string; description?: string; parameters?: object };
};

type CompletionOptions = {
  messages: ModelMessage[];
  tools?: ModelTool[];
  responseFormat?: object;
  signal: AbortSignal;
  maxTokens?: number;
  onContent?: (text: string) => void;
};

const MAX_RESPONSE_BYTES = 256 * 1024;
// Each streamed token repeats the completion metadata on the wire.
const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const MAX_STREAM_EVENT_LENGTH = 256 * 1024;
const MAX_CONTENT_LENGTH = 30000;

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function interrupted(signal: AbortSignal) {
  return signal.reason?.name === 'TimeoutError'
    ? new Error('The model request timed out. Check the model service and try again.')
    : new Error('The model request was cancelled.');
}

function responseError(status: number) {
  if (status === 401 || status === 403)
    return new Error('The model service denied access. Check its API key and permissions.');
  if (status === 402 || status === 429)
    return new Error('The model service has insufficient credits or reached its rate limit.');
  if (status === 404)
    return new Error(
      'The model or Chat Completions endpoint was not found. Check the URL and model name.'
    );
  if (status === 400 || status === 422)
    return new Error(
      `The model service rejected this request (HTTP ${status}). Check model and tool support.`
    );
  return new Error(`The model service returned HTTP ${status}. Try again later.`);
}

async function* responseChunks(response: Response, signal: AbortSignal, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The model service returned an empty response.');
  const decoder = new TextDecoder();
  let size = 0;
  let complete = false;
  const cancel = () => void reader.cancel().catch(() => undefined);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (!complete) {
      if (signal.aborted) throw interrupted(signal);
      const { done, value } = await reader.read().catch(() => {
        if (signal.aborted) throw interrupted(signal);
        throw new Error('The model response was interrupted. Try again.');
      });
      if (signal.aborted) throw interrupted(signal);
      if (done) {
        complete = true;
        const last = decoder.decode();
        if (last) yield last;
        break;
      }
      size += value.byteLength;
      if (size > limit) throw new Error('The model response is too large.');
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}

async function readResponse(response: Response, signal: AbortSignal) {
  let text = '';
  for await (const chunk of responseChunks(response, signal, MAX_RESPONSE_BYTES)) text += chunk;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('The model service did not return valid Chat Completions JSON.');
  }
}

async function readStream(
  response: Response,
  signal: AbortSignal,
  onContent: (text: string) => void
) {
  let content = '';
  let finished = false;
  let tail = '';
  let endedWithCR = false;
  let event = '';
  let data: string[] = [];
  let eventSize = 0;
  const invalid = () => new Error('The model service returned an invalid Chat Completions stream.');

  function readLine(line: string) {
    if (line) {
      if (line.length > MAX_STREAM_EVENT_LENGTH)
        throw new Error('The model response is too large.');
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) {
        eventSize += line.length;
        if (eventSize > MAX_STREAM_EVENT_LENGTH)
          throw new Error('The model response is too large.');
        data.push(line.slice(5).replace(/^ /, ''));
      }
      return false;
    }

    if (event === 'error') throw new Error('The model service reported an error while streaming.');
    const payload = data.join('\n').trim();
    data = [];
    event = '';
    eventSize = 0;
    if (!payload) return false;
    if (payload === '[DONE]') return true;

    let body: Record<string, unknown> | undefined;
    try {
      body = object(JSON.parse(payload));
    } catch {
      throw invalid();
    }
    if (body?.error != null)
      throw new Error('The model service reported an error while streaming.');
    const choices = body?.choices;
    if (!Array.isArray(choices)) throw invalid();
    if (!choices.length) return false;
    const choice = object(choices[0]);
    const delta = object(choice?.delta);
    if (
      !choice ||
      (!delta && (choice.delta != null || choice.finish_reason == null)) ||
      (delta?.content != null && typeof delta.content !== 'string')
    ) {
      throw invalid();
    }

    const reason = choice.finish_reason;
    if (reason === 'length')
      throw new Error('The model reached its response limit before completing the request.');
    if (
      (reason != null && reason !== 'stop') ||
      delta?.function_call != null ||
      (delta?.tool_calls != null && (!Array.isArray(delta.tool_calls) || delta.tool_calls.length))
    ) {
      throw new Error('The model did not return a usable reply.');
    }
    if (typeof delta?.content === 'string' && delta.content) {
      if (finished) throw invalid();
      content += delta.content;
      if (content.length > MAX_CONTENT_LENGTH) throw new Error('The model response is too large.');
      onContent(content);
      if (signal.aborted) throw interrupted(signal);
    }
    if (reason === 'stop') finished = true;
    return false;
  }

  for await (let chunk of responseChunks(response, signal, MAX_STREAM_BYTES)) {
    // A CRLF line ending may straddle two chunks.
    if (endedWithCR && chunk.startsWith('\n')) chunk = chunk.slice(1);
    endedWithCR = chunk.endsWith('\r');
    const lines = chunk.split(/\r\n|\r|\n/);
    lines[0] = tail + lines[0];
    tail = lines.pop() ?? '';
    if (tail.length > MAX_STREAM_EVENT_LENGTH) throw new Error('The model response is too large.');
    for (const line of lines) {
      if (readLine(line)) return content;
    }
  }
  if (!finished || tail || data.length) {
    throw new Error('The model response was interrupted. Try again.');
  }
  return content;
}

function readToolCalls(value: unknown): ModelToolCall[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 16)
    throw new Error('The model returned invalid tool calls.');
  const ids = new Set<string>();
  return value.map((item) => {
    const call = object(item);
    const fn = object(call?.function);
    if (
      call?.type !== 'function' ||
      typeof call.id !== 'string' ||
      !/^[\x21-\x7e]{1,128}$/.test(call.id) ||
      ids.has(call.id) ||
      typeof fn?.name !== 'string' ||
      !/^[\w-]{1,64}$/.test(fn.name) ||
      typeof fn.arguments !== 'string' ||
      fn.arguments.length > 16000
    ) {
      throw new Error('The model returned an invalid tool call.');
    }
    ids.add(call.id);
    return { id: call.id, type: 'function', function: { name: fn.name, arguments: fn.arguments } };
  });
}

export async function chatCompletion(
  config: Pick<ModelConfiguration, 'url' | 'model' | 'key'>,
  options: CompletionOptions
) {
  const { messages, tools, responseFormat, signal, maxTokens = 1800 } = options;
  const onContent = tools?.length ? undefined : options.onContent;
  const tokenLimit =
    new URL(config.url).hostname === 'api.openai.com'
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens };
  let response: Response;
  try {
    response = await fetch(config.url + '/chat/completions', {
      method: 'POST',
      signal,
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        ...(config.key ? { Authorization: 'Bearer ' + config.key } : {})
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        ...tokenLimit,
        ...(onContent ? { stream: true } : {}),
        ...(tools?.length ? { tools } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {})
      })
    });
  } catch {
    if (signal.aborted) throw interrupted(signal);
    throw new Error(
      'Could not reach the model service. Check the endpoint and network connection.'
    );
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw responseError(response.status);
  }

  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (onContent && contentType === 'text/event-stream') {
    const content = await readStream(response, signal, onContent);
    if (!content.trim()) throw new Error('The model did not return a usable reply.');
    return { content, tool_calls: [] };
  }

  const body = object(await readResponse(response, signal));
  const choices = body?.choices;
  const choice = Array.isArray(choices) ? object(choices[0]) : undefined;
  const message = object(choice?.message);
  if (!message || (message.content != null && typeof message.content !== 'string')) {
    throw new Error('The model service returned an invalid Chat Completions response.');
  }
  if (choice?.finish_reason === 'length')
    throw new Error('The model reached its response limit before completing the request.');
  if (typeof message.content === 'string' && message.content.length > MAX_CONTENT_LENGTH)
    throw new Error('The model response is too large.');
  const content =
    typeof message.content === 'string' && message.content.trim() ? message.content : null;
  const tool_calls = readToolCalls(message.tool_calls);
  if ((!content && !tool_calls.length) || (tool_calls.length && !tools?.length)) {
    throw new Error('The model did not return a usable reply.');
  }
  if (content) onContent?.(content);
  return { content, tool_calls };
}
