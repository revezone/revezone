import { useCallback } from 'react';
import { FileEdit, Trash2, ClipboardCopy, FileType, Palette, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RevezoneFile, RevezoneFolder } from '@renderer/types/file';
import useAddFile from '../useAddFile';
import useAddFolder from '../useAddFolder';
import useTabList from '../useTabList';

interface Props {
  deleteFile: (file: RevezoneFile) => void;
  deleteFolder: (folder: RevezoneFolder) => void;
}

export default function useFileTreeContextMenu(props: Props) {
  const { t } = useTranslation();
  const { deleteFile, deleteFolder } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { tabList } = useTabList();

  const getFileTreeContextMenu = useCallback(
    (item: RevezoneFile | RevezoneFolder, context, isFolder: boolean) => {
      const commonContextMenu = [
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
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            console.log('delete', item, context);

            if (isFolder) {
              deleteFolder(item as RevezoneFolder);
            } else {
              deleteFile(item as RevezoneFile);
            }
          }
        }
      ];

      if (isFolder) {
        return [
          {
            key: 'addboard',
            label: t('operation.addBoard'),
            icon: <Palette className="w-4" />,
            onClick: async ({ domEvent }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Board', 'board', tabList, item.id);
            }
          },
          {
            key: 'addnote',
            label: t('operation.addNote'),
            icon: <FileType className="w-4" />,
            onClick: async ({ domEvent }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Note', 'note', tabList, item.id);
            }
          },
          {
            key: 'addfolder',
            label: t('operation.addFolder'),
            icon: <FolderPlus className="w-4" />,
            onClick: async ({ domEvent }) => {
              domEvent.stopPropagation();
              addFolder('New Folder', item.id);
            }
          },
          ...commonContextMenu
        ];
      } else {
        return [
          ...commonContextMenu,
          {
            key: 'copy_revezone_link',
            label: t('operation.copyRevezoneLink'),
            icon: <ClipboardCopy className="w-4" />,
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              navigator.clipboard.writeText(`revezone://${item.id}`);
            }
          }
        ];
      }
    },
    []
  );

  return { getFileTreeContextMenu };
}
