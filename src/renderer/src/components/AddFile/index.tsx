import { useCallback } from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { Dropdown } from 'antd';
import { RevenoteFileType } from '@renderer/types/file';

interface Props {
  size: 'small' | 'middle' | 'large';
  folderId: string | undefined;
  addFile: (folderId: string, type: RevenoteFileType) => void;
}

export default function AddFile(props: Props) {
  const { folderId, size = 'middle', addFile } = props;

  const getAddFileMenu = useCallback(
    (folderId) => [
      {
        key: 'markdown',
        label: <span className="text-xs">Markdown</span>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folderId, 'markdown');
        }
      },
      {
        key: 'canvas',
        label: <span className="text-xs">Canvas</span>,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          addFile(folderId, 'canvas');
        }
      }
    ],
    []
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

  return (
    <Dropdown menu={{ items: getAddFileMenu(folderId) }}>
      <DocumentPlusIcon
        className={`${getSizeClassName()} text-current cursor-pointer mr-4 menu-icon`}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
}
