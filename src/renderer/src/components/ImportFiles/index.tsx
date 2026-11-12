import { useRef, type ChangeEvent } from 'react';
import { message } from 'antd';
import { useStore } from 'jotai';
import { useTranslation } from 'react-i18next';
import useAddFile from '@renderer/hooks/useAddFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import { tabModelAtom } from '@renderer/store/jotai';
import {
  getFileNameWithoutSuffix,
  getFileSuffix,
  getFileTypeFromSuffix
} from '@renderer/utils/file';

export function useImportBoards() {
  const { t } = useTranslation();
  const { addFile } = useAddFile();
  const { model } = useTabJsonModel();
  const store = useStore();
  const pickerRef = useRef<HTMLInputElement>(null);

  const importBoards = () => pickerRef.current?.click();

  const onChooseBoards = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';

    for (const file of files) {
      const type = getFileTypeFromSuffix(getFileSuffix(file.name).toLowerCase());

      if (type !== 'board' && type !== 'tldraw') {
        message.error(t('welcome.unsupportedBoard', { name: file.name }));
        continue;
      }

      try {
        const data = await file.text();
        await addFile(
          getFileNameWithoutSuffix(file.name),
          type,
          store.get(tabModelAtom),
          'root',
          data
        );
      } catch (error) {
        console.error(error);
        message.error(t('welcome.importBoardError', { name: file.name }));
      }
    }
  };

  const boardPicker = (
    <input
      ref={pickerRef}
      type="file"
      accept=".excalidraw,.tldr"
      multiple
      hidden
      onChange={onChooseBoards}
    />
  );

  return { importBoards, boardPicker, canImport: !!model };
}

export default function ImportFiles() {
  const { t } = useTranslation();
  const { importBoards, boardPicker, canImport } = useImportBoards();

  return (
    <>
      <button type="button" onClick={importBoards} disabled={!canImport}>
        {t('operation.import')}
      </button>
      {boardPicker}
    </>
  );
}
