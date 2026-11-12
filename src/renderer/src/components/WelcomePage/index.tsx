import { Download, Plus } from 'lucide-react';
import { message } from 'antd';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useAddFile from '@renderer/hooks/useAddFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import { isInRevezoneApp, osName } from '@renderer/utils/navigator';
import { useImportBoards } from '../ImportFiles';
import whiteboardArtwork from './welcome-whiteboard.webp';
import './index.css';

export default function WelcomePage() {
  const { t } = useTranslation();
  const { addFile } = useAddFile();
  const { model } = useTabJsonModel();
  const { importBoards, boardPicker, canImport } = useImportBoards();
  const creating = useRef(false);
  const storageHint = isInRevezoneApp
    ? osName === 'MacOS'
      ? 'welcome.storageMac'
      : 'welcome.storageDesktop'
    : 'welcome.storageBrowser';

  async function createFile(type: 'board' | 'note') {
    if (!model || creating.current) return;
    creating.current = true;
    try {
      const name = t(type === 'board' ? 'operation.newBoardName' : 'operation.newNoteName');
      await addFile(name, type, model, 'root');
    } catch (error) {
      console.error(error);
      message.error(t('welcome.createFileError'));
    } finally {
      creating.current = false;
    }
  }

  return (
    <main className="rz-welcome" aria-labelledby="rz-welcome-heading">
      {boardPicker}
      <div className="rz-welcome-content">
        <img className="rz-welcome-artwork" src={whiteboardArtwork} alt="" width={80} height={69} />
        <h1 id="rz-welcome-heading">{t('welcome.startCreating')}</h1>
        <p>{t(storageHint)}</p>
        <div className="rz-welcome-actions">
          <button
            type="button"
            className="rz-welcome-button rz-welcome-primary"
            disabled={!model}
            onClick={() => void createFile('board')}
          >
            <Plus size={15} aria-hidden="true" />
            {t('welcome.newBoard')}
          </button>
          <button
            type="button"
            className="rz-welcome-button"
            disabled={!model}
            onClick={() => void createFile('note')}
          >
            {t('operation.addNote')}
          </button>
        </div>
        <button
          type="button"
          className="rz-welcome-import"
          disabled={!canImport}
          onClick={importBoards}
        >
          <Download size={15} aria-hidden="true" />
          {t('welcome.importBoard')}
        </button>
      </div>
    </main>
  );
}
