import { useEffect, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import type { RevezoneFile } from '@renderer/types/file';
import useDoubleLink from '@renderer/hooks/useDoubleLink';
import { blockNoteStorage, LegacyNoteMigrationError } from '@renderer/store/blockNoteStorage';
import type { BlockNoteDocument } from '@renderer/store/blockNoteStorage';
import BlockNoteEditor from '../BlockNoteEditor';
import './index.css';

type NoteLoad =
  | { id: string; document: BlockNoteDocument }
  | { id: string; error: string; legacy: boolean };

function NoteEditor({ file }: { file: RevezoneFile }) {
  const { onLinkOpen } = useDoubleLink(true);
  const { i18n } = useTranslation();
  const chinese = i18n.language.startsWith('zh');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<NoteLoad>();
  const [backupError, setBackupError] = useState('');
  const id = file.id;

  useEffect(() => {
    let active = true;
    setLoaded(undefined);
    setBackupError('');
    void blockNoteStorage.load(id).then(
      (document) => {
        if (active) setLoaded({ id, document });
      },
      (reason: unknown) => {
        if (active) {
          setLoaded({
            id,
            error: reason instanceof Error ? reason.message : String(reason),
            legacy: reason instanceof LegacyNoteMigrationError
          });
        }
      }
    );
    return () => {
      active = false;
    };
  }, [attempt, id]);

  async function exportLegacy() {
    setBackupError('');
    try {
      const snapshot = await blockNoteStorage.legacySnapshot(id);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot)], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      const name = (file.name || id).replace(/[\\/:*?"<>|\p{Cc}]/gu, '_');
      link.download = name + '.revezone-legacy.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setBackupError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  if (!loaded || loaded.id !== id) {
    return (
      <div className="rz-note-load" role="status">
        <Spin size="small" />
        <span>{chinese ? '正在打开笔记…' : 'Opening note…'}</span>
      </div>
    );
  }

  if ('error' in loaded) {
    return (
      <div className="rz-note-load" data-testid="note-migration-error">
        <Alert
          showIcon
          type="error"
          message={
            chinese
              ? '无法打开笔记，原始数据已保留'
              : 'Could not open the note. Original data is preserved.'
          }
          description={backupError || loaded.error}
          action={
            <div className="rz-note-retry">
              <Button size="small" onClick={() => setAttempt((value) => value + 1)}>
                {chinese ? '重试' : 'Retry'}
              </Button>
              {loaded.legacy && (
                <Button
                  size="small"
                  data-testid="note-export-legacy"
                  onClick={() => void exportLegacy()}
                >
                  {chinese ? '导出旧笔记备份' : 'Export legacy backup'}
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <BlockNoteEditor
      key={id}
      file={file}
      initialDocument={loaded.document}
      onLinkOpen={onLinkOpen}
    />
  );
}

export default NoteEditor;
