import { useCallback } from 'react';
import { FileEdit, Trash2, ClipboardCopy } from 'lucide-react';
import { EditableTextState } from '@renderer/types/menu';
import { useTranslation } from 'react-i18next';
import { RevezoneFile, RevezoneFolder } from '@renderer/types/file';

interface Props {
  deleteFile: (file: RevezoneFile) => void;
}

export default function useFileContextMenu(props: Props) {
  const { t } = useTranslation();
  const { deleteFile } = props;

  const getFileContextMenu = useCallback((file: RevezoneFile, context, isFolder: boolean) => {
    const folderContextMenu = [
      {
        key: 'rename',
        label: t('operation.rename'),
        icon: <FileEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          context.startRenamingItem();
        }
      },
      {
        key: 'delete',
        label: t('operation.delete'),
        icon: <Trash2 className="w-4"></Trash2>,
        onClick: () => {
          console.log('delete', file, context);
          // deleteFile(file);
        }
      }
    ];

    if (isFolder) {
      return folderContextMenu;
    } else {
      return [
        ...folderContextMenu,
        {
          key: 'copy_revezone_link',
          label: t('operation.copyRevezoneLink'),
          icon: <ClipboardCopy className="w-4" />,
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            navigator.clipboard.writeText(`revezone://${file.id}`);
          }
        }
      ];
    }
  }, []);

  return [getFileContextMenu];
}
