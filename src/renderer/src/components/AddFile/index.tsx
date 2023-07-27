import { useCallback } from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { Dropdown, message } from 'antd';
import { FileTree, RevenoteFileType } from '@renderer/types/file';
import { useTranslation } from 'react-i18next';
import { currentFileIdAtom, fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { menuIndexeddbStorage } from '@renderer/store/menuIndexeddb';
import { Palette, FileType } from 'lucide-react';

interface Props {
  size: 'small' | 'middle' | 'large';
  folderId: string | undefined;
  onAdd?: (fileId: string, folderId: string) => void;
}

export default function AddFile(props: Props) {
  const { folderId, size = 'middle', onAdd } = props;
  const [, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);

  const { t } = useTranslation();

  const getAddFileMenu = useCallback(
    (folderId) => [
      {
        key: 'note',
        label: (
          <span className="text-xs">
            <FileType className="w-4 h-4 mr-2" />
            Note
          </span>
        ),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folderId, 'note', fileTree);
        }
      },
      {
        key: 'board',
        label: (
          <span className="text-xs">
            <Palette className="w-4 h-4 mr-2" />
            Board
          </span>
        ),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folderId, 'board', fileTree);
        }
      }
    ],
    [fileTree]
  );

  const getSizeClassName = useCallback(() => {
    switch (size) {
      case 'small':
        return 'h-4 w-4';
      case 'middle':
        return 'h-5 w-5';
      case 'large':
        return 'h-6 w-6';
      default:
        return 'h-5 w-5';
    }
  }, [size]);

  const addFile = useCallback(
    async (folderId: string | undefined, type: RevenoteFileType, fileTree: FileTree) => {
      const _folderId = folderId || fileTree?.[0]?.id;

      if (!_folderId) {
        message.info(t('message.createFolderFirst'));
        return;
      }

      const file = await menuIndexeddbStorage.addFile(_folderId, type);
      const tree = await menuIndexeddbStorage.getFileTree();
      setFileTree(tree);

      setCurrentFileId(file.id);

      onAdd?.(file.id, _folderId);
    },
    []
  );

  return (
    <Dropdown menu={{ items: getAddFileMenu(folderId) }}>
      <DocumentPlusIcon
        className={`${getSizeClassName()} text-current cursor-pointer mr-4 menu-icon`}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
}
