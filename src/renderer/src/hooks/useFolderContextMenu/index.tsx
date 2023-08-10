import { useCallback } from 'react';
import { FolderEdit, Trash2, FileType, Palette } from 'lucide-react';
import { FileTree, RevezoneFolder, RevezoneFileType } from '@renderer/types/file';
import { EditableTextState } from '@renderer/types/menu';
import { useTranslation } from 'react-i18next';

interface Props {
  fileTree: FileTree;
  editableTextState: EditableTextState;
  addFile: (folderId: string | undefined, type: RevezoneFileType, fileTree: FileTree) => void;
  updateEditableTextState: (
    id: string,
    value: boolean,
    editableTextState: EditableTextState
  ) => void;
  deleteFolder: (folderId: string) => void;
}

export default function useFolderContextMenu(props: Props) {
  const { editableTextState, fileTree, addFile, updateEditableTextState, deleteFolder } = props;
  const { t } = useTranslation();

  const getFolderContextMenu = useCallback(
    (folder: RevezoneFolder) => [
      {
        key: 'addnote',
        label: t('operation.addNote'),
        icon: <FileType className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folder.id, 'note', fileTree);
        }
      },
      {
        key: 'addboard',
        label: t('operation.addBoard'),
        icon: <Palette className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folder.id, 'board', fileTree);
        }
      },
      {
        key: 'rename',
        label: t('operation.rename'),
        icon: <FolderEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          updateEditableTextState(folder.id, false, editableTextState);
        }
      },
      {
        key: 'delete',
        label: t('operation.delete'),
        icon: <Trash2 className="w-4"></Trash2>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          deleteFolder(folder.id);
        }
      }
    ],
    [editableTextState]
  );

  return [getFolderContextMenu];
}
