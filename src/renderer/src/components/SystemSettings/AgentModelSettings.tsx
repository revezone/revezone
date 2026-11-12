import { Alert, Button, Form, Input, Select, Skeleton, Space } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelSettings, ModelSettingsInput } from '../../../../shared/modelConfig';
import { emitter, events } from '@renderer/store/eventemitter';
import { getAgentModelStrings } from './agentModelStrings';

const CLI_NAMES = { codex: 'Codex CLI', claude: 'Claude Code' };
type Backend = 'builtin' | keyof typeof CLI_NAMES;
type Draft = { backend: Backend; baseUrl: string; model: string; apiKey: string };
type Feedback = { type: 'success' | 'error'; message: string };
const EMPTY: Draft = { backend: 'builtin', baseUrl: '', model: '', apiKey: '' };

function toDraft(settings: ModelSettings): Draft {
  return {
    backend:
      settings.backend === 'codex' || settings.backend === 'claude' ? settings.backend : 'builtin',
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKey: ''
  };
}

function displayError(reason: unknown, fallback: string, key?: string) {
  if (!(reason instanceof Error)) return fallback;
  const message = reason.message.replace(/^Error invoking remote method '[^']+': Error: /, '');
  return (key ? message.split(key).join('••••') : message) || fallback;
}

function comparableEndpoint(value: string) {
  try {
    return new URL(value.trim()).href.replace(/\/+$/, '');
  } catch {
    return value.trim();
  }
}

export default function AgentModelSettings({ active }: { active: boolean }) {
  const { i18n } = useTranslation();
  const copy = getAgentModelStrings(i18n.language);
  const id = useId();
  const operation = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [settings, setSettings] = useState<ModelSettings>();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [clearApiKey, setClearApiKey] = useState(false);
  const [busy, setBusy] = useState<'test' | 'save'>();
  const [feedback, setFeedback] = useState<Feedback>();

  useEffect(() => {
    const attempt = ++operation.current;
    setDraft(EMPTY);
    setClearApiKey(false);
    setSettings(undefined);
    setBusy(undefined);
    setFeedback(undefined);
    const bridge = window.revezoneModel;
    if (active && bridge) {
      void bridge.get().then(
        (saved) => {
          if (attempt !== operation.current) return;
          setSettings(saved);
          setDraft(toDraft(saved));
        },
        (reason) => {
          if (attempt !== operation.current) return;
          setFeedback({ type: 'error', message: displayError(reason, copy.loadFailed) });
        }
      );
    }
    return () => {
      operation.current++;
    };
  }, [active, loadAttempt, copy.loadFailed]);

  if (!active) return null;
  if (!settings) {
    return feedback ? (
      <Alert
        type="error"
        showIcon
        message={feedback.message}
        action={
          <Button size="small" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            {copy.retry}
          </Button>
        }
      />
    ) : (
      <Skeleton active title={false} paragraph={{ rows: 3 }} />
    );
  }

  const { backend } = draft;
  const builtin = backend === 'builtin';
  const backendName = builtin ? copy.builtin : CLI_NAMES[backend];
  const apiKey = builtin ? draft.apiKey.trim() : '';
  const complete = !builtin || (!!draft.baseUrl.trim() && !!draft.model.trim());
  const dirty =
    backend !== (settings.backend ?? 'builtin') ||
    (builtin &&
      (draft.baseUrl.trim() !== settings.baseUrl ||
        draft.model.trim() !== settings.model ||
        !!apiKey ||
        clearApiKey));
  const cannotSaveKey = !!apiKey && !settings.keyStorageAvailable;
  const addressChanged = comparableEndpoint(draft.baseUrl) !== comparableEndpoint(settings.baseUrl);

  function change<K extends keyof Draft>(field: K, value: Draft[K]) {
    setFeedback(undefined);
    setDraft((previous) => ({
      ...previous,
      ...(field === 'backend' ? { apiKey: '' } : {}),
      [field]: value
    }));
    if (field === 'backend' || field === 'apiKey') setClearApiKey(false);
  }

  async function run(action: 'test' | 'save') {
    const bridge = window.revezoneModel;
    if (
      !bridge ||
      !settings ||
      !complete ||
      busy ||
      (action === 'save' && (!dirty || cannotSaveKey))
    )
      return;
    const attempt = ++operation.current;
    const input: ModelSettingsInput = builtin
      ? {
          backend,
          baseUrl: draft.baseUrl.trim(),
          model: draft.model.trim(),
          ...(apiKey ? { apiKey } : {}),
          ...(clearApiKey ? { clearApiKey: true } : {})
        }
      : { backend };
    setBusy(action);
    setFeedback(undefined);
    try {
      if (action === 'test') {
        const result = await bridge.test(input);
        if (attempt !== operation.current) return;
        const message = builtin
          ? copy.testPassed(result.latencyMs)
          : copy.cliPassed(result.latencyMs);
        setFeedback({ type: 'success', message });
      } else {
        const saved = await bridge.save(input);
        emitter.emit(events.AGENT_MODEL_SETTINGS_SAVED);
        if (attempt !== operation.current) return;
        setSettings(saved);
        setDraft(toDraft(saved));
        setClearApiKey(false);
        setFeedback({ type: 'success', message: copy.saved });
      }
    } catch (reason) {
      if (attempt !== operation.current) return;
      setFeedback({
        type: 'error',
        message: displayError(reason, action === 'test' ? copy.testFailed : copy.saveFailed, apiKey)
      });
    } finally {
      if (attempt === operation.current) setBusy(undefined);
    }
  }

  const keyHelp = clearApiKey
    ? copy.keyRemoving
    : addressChanged && settings.hasApiKey
    ? copy.keyNewAddress
    : settings.keySource === 'env'
    ? copy.keyEnv
    : settings.hasApiKey
    ? copy.keySaved
    : copy.keyOptional;

  return (
    <Form layout="vertical" onFinish={() => void run('save')} data-testid="agent-model-settings">
      <Form.Item label={copy.backend} htmlFor={id + '-backend'}>
        <Select<Backend>
          id={id + '-backend'}
          value={backend}
          disabled={!!busy}
          onChange={(value) => change('backend', value)}
          options={[
            { value: 'builtin', label: copy.builtin },
            { value: 'codex', label: CLI_NAMES.codex },
            { value: 'claude', label: CLI_NAMES.claude }
          ]}
        />
      </Form.Item>
      {builtin ? (
        <>
          <Form.Item label={copy.baseUrl} htmlFor={id + '-url'} required>
            <Input
              id={id + '-url'}
              value={draft.baseUrl}
              maxLength={2048}
              autoComplete="off"
              spellCheck={false}
              disabled={!!busy}
              onChange={(event) => change('baseUrl', event.target.value)}
            />
          </Form.Item>
          <Form.Item label={copy.model} htmlFor={id + '-model'} required>
            <Input
              id={id + '-model'}
              value={draft.model}
              maxLength={256}
              autoComplete="off"
              spellCheck={false}
              disabled={!!busy}
              onChange={(event) => change('model', event.target.value)}
            />
          </Form.Item>
          <Form.Item label={copy.key} htmlFor={id + '-key'} extra={keyHelp}>
            <Input
              id={id + '-key'}
              type="password"
              value={draft.apiKey}
              maxLength={4096}
              autoComplete="new-password"
              disabled={!!busy}
              onChange={(event) => change('apiKey', event.target.value)}
            />
            {settings.keySource === 'saved' && !apiKey && (
              <Button
                type="link"
                size="small"
                disabled={!!busy}
                onClick={() => {
                  setClearApiKey((remove) => !remove);
                  setFeedback(undefined);
                }}
              >
                {clearApiKey ? copy.keepKey : copy.removeKey}
              </Button>
            )}
          </Form.Item>
          {!settings.keyStorageAvailable && (
            <Alert type="info" message={copy.keyStorage} showIcon className="mb-4" />
          )}
        </>
      ) : (
        <p className="mb-4">{copy.cliHelp(backendName)}</p>
      )}
      <Space wrap>
        <Button
          disabled={!complete || !!busy}
          loading={busy === 'test'}
          onClick={() => void run('test')}
        >
          {copy.test}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={busy === 'save'}
          disabled={!complete || !dirty || cannotSaveKey || !!busy}
        >
          {copy.save}
        </Button>
      </Space>
      {feedback && (
        <Alert type={feedback.type} message={feedback.message} showIcon className="mt-4" />
      )}
    </Form>
  );
}
