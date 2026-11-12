import { useEffect, useState } from 'react';
import { Clock3, Save } from 'lucide-react';
import { Modal } from 'antd';
import { exportToBlob } from 'revedraw';
import type { VersionRecord, VersionSummary } from '../../../../shared/versionHistory';
import type { AiEditorAdapter } from '@renderer/ai/editorRegistry';
import {
  AppliedSaveError,
  restoreAiVersion,
  saveManualVersion,
  subscribeVersionHistory
} from '@renderer/ai/editorRegistry';
import { parseBoardSnapshot } from '@renderer/ai/boardAdapter';
import type { AiStrings } from './strings';

function VersionPreview({
  record,
  adapter,
  strings
}: {
  record: VersionRecord;
  adapter: AiEditorAdapter;
  strings: AiStrings;
}) {
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (record.kind !== 'board') return;
    let active = true;
    let url = '';
    setImage('');
    setFailed(false);
    void (async () => {
      const snapshot = parseBoardSnapshot(record.snapshot);
      if (!snapshot.elements.length) return;
      const image = await exportToBlob({
        elements: snapshot.elements,
        files: snapshot.files,
        appState: { viewBackgroundColor: snapshot.background, exportBackground: true },
        mimeType: 'image/png',
        maxWidthOrHeight: 850
      });
      if (active) {
        url = URL.createObjectURL(image);
        setImage(url);
      }
    })().catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [record]);

  if (record.kind === 'board') {
    if (failed) return <p className="rz-ai-muted">{strings.unavailable}</p>;
    if (image) return <img className="rz-ai-version-image" src={image} alt={strings.preview} />;
    try {
      const elements = parseBoardSnapshot(record.snapshot).elements;
      return (
        <p className="rz-ai-muted">{elements.length ? strings.historyLoading : strings.blank}</p>
      );
    } catch {
      return <p className="rz-ai-muted">{strings.unavailable}</p>;
    }
  }
  let blocks: string[] | undefined;
  try {
    blocks = adapter.preview?.(record.snapshot);
  } catch {
    return <p>{strings.unavailable}</p>;
  }
  return (
    <div className="rz-ai-note-preview">
      {blocks?.length ? (
        blocks.map((block, index) => <p key={index}>{block}</p>)
      ) : (
        <p>{blocks ? strings.blank : strings.unavailable}</p>
      )}
    </div>
  );
}

export default function HistoryPanel({
  adapter,
  strings,
  createCopy
}: {
  adapter: AiEditorAdapter;
  strings: AiStrings;
  createCopy?: (version: VersionRecord) => Promise<void>;
}) {
  const [versions, setVersions] = useState<VersionSummary[]>();
  const [record, setRecord] = useState<VersionRecord>();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void window.versionHistory
        ?.list(adapter.docId)
        .then((values) => {
          if (active) setVersions(values);
        })
        .catch(() => {
          if (active) setError(strings.historyError);
        });
    };
    refresh();
    const unsubscribe = subscribeVersionHistory((id) => {
      if (id === adapter.docId) refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [adapter.docId, strings.historyError]);

  async function perform(work: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      if (success) setNotice(success);
    } catch (reason) {
      if (reason instanceof AppliedSaveError) {
        setConfirmRestore(false);
        setError(strings.persistError);
      } else {
        setError(reason instanceof Error ? reason.message : strings.historyError);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rz-ai-content" aria-label={strings.history}>
        <p className="rz-ai-muted">{strings.historyIntro}</p>
        {notice && (
          <p className="rz-ai-success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="rz-ai-error" role="alert">
            {error}
          </p>
        )}
        {versions === undefined && !error && (
          <p className="rz-ai-muted">{strings.historyLoading}</p>
        )}
        {versions?.length === 0 && <p className="rz-ai-muted">{strings.none}</p>}
        {versions?.map((version) => (
          <div key={version.id} className="rz-ai-version">
            <button
              type="button"
              className="rz-ai-version-trigger"
              data-testid={'version-' + version.source}
              aria-expanded={record?.id === version.id}
              onClick={() =>
                void perform(async () => {
                  if (record?.id === version.id) return setRecord(undefined);
                  const loaded = await window.versionHistory?.get(adapter.docId, version.id);
                  if (!loaded) throw new Error(strings.historyError);
                  setRecord(loaded);
                })
              }
              disabled={busy}
            >
              <Clock3 size={15} aria-hidden="true" />
              <span>
                <strong>{strings[version.source]}</strong>
                {version.label && <span className="rz-ai-version-label">{version.label}</span>}
                <time dateTime={version.createdAt}>
                  {new Date(version.createdAt).toLocaleString()}
                </time>
              </span>
            </button>
            {record?.id === version.id && (
              <div className="rz-ai-version-detail">
                <VersionPreview
                  key={record.id}
                  record={record}
                  adapter={adapter}
                  strings={strings}
                />
                <div className="rz-ai-actions">
                  <button
                    type="button"
                    data-testid="restore-version"
                    onClick={() => setConfirmRestore(true)}
                    disabled={busy}
                  >
                    {strings.restoreButton}
                  </button>
                  {createCopy && (
                    <button
                      type="button"
                      onClick={() => void perform(() => createCopy(record))}
                      disabled={busy}
                    >
                      {strings.copy}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        className="rz-ai-checkpoint"
        onSubmit={(event) => {
          event.preventDefault();
          void perform(async () => {
            await saveManualVersion(adapter, name.trim());
            setName('');
          }, strings.saved);
        }}
      >
        <input
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          aria-label={strings.versionName}
          placeholder={strings.versionName}
        />
        <button type="submit" className="rz-ai-primary" disabled={busy}>
          <Save size={15} aria-hidden="true" /> {strings.checkpoint}
        </button>
      </form>
      <Modal
        open={confirmRestore}
        title={strings.restoreTitle}
        okText={strings.restoreButton}
        cancelText={strings.cancel}
        confirmLoading={busy}
        onCancel={() => setConfirmRestore(false)}
        onOk={() => {
          if (!record) return;
          void perform(async () => {
            await restoreAiVersion(adapter, record.id);
            setConfirmRestore(false);
            setRecord(undefined);
          }, strings.restored);
        }}
      >
        <p>{strings.restorePrompt}</p>
        {error && (
          <p className="rz-ai-error" role="alert">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
