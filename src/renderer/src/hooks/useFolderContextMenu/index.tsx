import { useCallback } from 'react';
import { FolderEdit, Trash2, FileType, Palette } from 'lucide-react';
import { FileTree, RevenoteFolder, RevenoteFileType } from '@renderer/types/file';
import { EditableTextState } from '@renderer/types/menu';

interface Props {
  fileTree: FileTree;
  editableTextState: EditableTextState;
  addFile: (folderId: string | undefined, type: RevenoteFileType, fileTree: FileTree) => void;
  updateEditableTextState: (
    id: string,
    value: boolean,
    editableTextState: EditableTextState
  ) => void;
  deleteFolder: (folderId: string) => void;
}

export default function useFolderContextMenu(props: Props) {
  const { editableTextState, fileTree, addFile, updateEditableTextState, deleteFolder } = props;

  const getFolderContextMenu = useCallback(
    (folder: RevenoteFolder) => [
      {
        key: 'addnote',
        label: 'Add a note',
        icon: <FileType className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folder.id, 'note', fileTree);
        }
      },
      {
        key: 'addboard',
        label: 'Add a board',
        icon: <Palette className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folder.id, 'board', fileTree);
        }
      },
      {
        key: 'rename',
        label: 'rename',
        icon: <FolderEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          updateEditableTextState(folder.id, false, editableTextState);
        }
      },
      {
        key: 'delete',
        label: 'delete',
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
