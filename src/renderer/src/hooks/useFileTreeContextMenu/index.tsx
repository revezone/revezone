import { useCallback } from 'react';
import { FileEdit, Trash2, ClipboardCopy, FileType, Palette, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RevezoneFile, RevezoneFolder } from '@renderer/types/file';
import useAddFile from '../useAddFile';
import useAddFolder from '../useAddFolder';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import useTabJsonModel from '../useTabJsonModel';
import { TreeItemRenderContext } from 'react-complex-tree';
import { Popconfirm } from 'antd';

interface Props {
  deleteFile: (file: RevezoneFile) => void;
  deleteFolder: (folder: RevezoneFolder) => void;
}

export default function useFileTreeContextMenu(props: Props) {
  const { t } = useTranslation();
  const { deleteFile, deleteFolder } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { model } = useTabJsonModel();

  const getFileTreeContextMenu = useCallback(
    (item: RevezoneFile | RevezoneFolder, context: TreeItemRenderContext, isFolder: boolean) => {
      const commonContextMenu = [
        {
          key: 'rename',
          label: t('operation.rename'),
          icon: <FileEdit className="w-4" />,
          onClick: ({ domEvent }: { domEvent: Event }) => {
            domEvent.stopPropagation();
            console.log('rename');
            context.startRenamingItem();
            setRenamingMenuItemIdToLocal(item.id);
          }
        },
        {
          key: 'delete',
          label: (
            <Popconfirm
              title={`确定删除 ${item.name} ？`}
              onConfirm={() => {
                console.log('delete', item, context);

                if (isFolder) {
                  deleteFolder(item as RevezoneFolder);
                } else {
                  deleteFile(item as RevezoneFile);
                }
              }}
            >
              {t('operation.delete')}
            </Popconfirm>
          ),
          icon: <Trash2 className="w-4"></Trash2>,
          onClick: ({ domEvent }: { domEvent: Event }) => {
            domEvent.stopPropagation();
          }
        }
      ];

      if (isFolder) {
        return [
          {
            key: 'addboard',
            label: t('operation.addBoard'),
            icon: <Palette className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Board', 'board', model, item.id);
            }
          },
          {
            key: 'addnote',
            label: t('operation.addNote'),
            icon: <FileType className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Note', 'note', model, item.id);
            }
          },
          {
            key: 'addfolder',
            label: t('operation.addFolder'),
            icon: <FolderPlus className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
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
            onClick: ({ domEvent }: { domEvent: Event }) => {
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
