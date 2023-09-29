import { useCallback, useState } from 'react';
import {
  FileEdit,
  Trash2,
  ClipboardCopy,
  FileType,
  Palette,
  FolderPlus,
  FolderOpen
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RevezoneFile, RevezoneFileTree, RevezoneFolder } from '@renderer/types/file';
import useAddFile from '../useAddFile';
import useAddFolder from '../useAddFolder';
import { setRenamingMenuItemIdToLocal } from '@renderer/store/localstorage';
import { TreeItemRenderContext } from 'react-complex-tree';
import { Modal } from 'antd';
import { Model } from 'flexlayout-react';
import { TldrawIcon } from '@renderer/icons';
import { isInRevezoneApp } from '@renderer/utils/navigator';

interface Props {
  deleteFile: (file: RevezoneFile, tabModel: Model) => void;
  deleteFolder: (folder: RevezoneFolder, tabModel: Model) => void;
}

let selectedItems: (RevezoneFile | RevezoneFolder)[];

export default function useFileTreeContextMenu(props: Props) {
  const { t } = useTranslation();
  const { deleteFile, deleteFolder } = props;
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getFileTreeContextMenu = useCallback(
    (
      item: RevezoneFile | RevezoneFolder,
      context: TreeItemRenderContext,
      isFolder: boolean,
      tabModel: Model | undefined,
      fileTree: RevezoneFileTree,
      selectedKeys: string[]
    ) => {
      if (!(tabModel && fileTree)) {
        return;
      }

      const openDirectoryMenu = isInRevezoneApp
        ? [
            {
              key: 'open_directory',
              label: t('operation.openDirectory'),
              icon: <FolderOpen className="w-4" />,
              onClick: ({ domEvent }: { domEvent: Event }) => {
                domEvent.stopPropagation();
                window.api.showItemInFolder(item.id, fileTree);
              }
            }
          ]
        : [];

      const commonContextMenu = [
        {
          key: 'rename',
          label: t('operation.rename'),
          icon: <FileEdit className="w-4" />,
          onClick: ({ domEvent }: { domEvent: Event }) => {
            domEvent.stopPropagation();
            context.startRenamingItem();
            setRenamingMenuItemIdToLocal(item.id);
          }
        },
        ...openDirectoryMenu,
        {
          key: 'delete',
          label: t('operation.delete'),
          icon: <Trash2 className="w-4"></Trash2>,
          onClick: ({ domEvent }: { domEvent: Event }) => {
            domEvent.stopPropagation();

            selectedItems = selectedKeys.map((key) => fileTree[key].data);

            setIsModalOpen(true);
          }
        }
      ];

      if (isFolder) {
        return [
          {
            key: 'addexcalidraw',
            label: t('operation.addBoard'),
            icon: <Palette className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Board', 'board', tabModel, item.id);
            }
          },
          {
            key: 'addtldraw',
            label: t('operation.addTldraw'),
            icon: <TldrawIcon className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Tldraw', 'tldraw', tabModel, item.id);
            }
          },
          {
            key: 'addnote',
            label: t('operation.addNote'),
            icon: <FileType className="w-4" />,
            onClick: async ({ domEvent }: { domEvent: Event }) => {
              domEvent.stopPropagation();
              domEvent.preventDefault();
              addFile('New Note', 'note', tabModel, item.id);
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

  const getDeleteFileModal = (tabModel: Model | undefined) => (
    <Modal
      title={`${t('confirm.confirmDelete')} ${selectedItems?.map((item) => item.name).join(',')} ?`}
      open={isModalOpen}
      onOk={async () => {
        for await (const item of selectedItems) {
          if (item.name.startsWith('folder_')) {
            tabModel && (await deleteFolder(item as RevezoneFolder, tabModel));
          } else {
            tabModel && (await deleteFile(item as RevezoneFile, tabModel));
          }
        }

        setIsModalOpen(false);
      }}
      onCancel={() => setIsModalOpen(false)}
    ></Modal>
  );

  return { isModalOpen, getFileTreeContextMenu, getDeleteFileModal };
}
