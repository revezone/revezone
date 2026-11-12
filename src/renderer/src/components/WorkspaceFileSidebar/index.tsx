import { useEffect, useState } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  Download,
  FileText,
  FolderPlus,
  HardDrive,
  Plus,
  Search,
  Settings,
  Spline
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAddFile from '@renderer/hooks/useAddFile';
import useAddFolder from '@renderer/hooks/useAddFolder';
import useCurrentFolderId from '@renderer/hooks/useCurrentFolderId';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import { TldrawIcon } from '@renderer/icons';
import { emitter, events } from '@renderer/store/eventemitter';
import DraggableMenuTree from '../DraggableMenuTree';
import { useImportBoards } from '../ImportFiles';
import SystemSettings from '../SystemSettings';
import './index.css';

const sidebarLabels = {
  en: {
    files: 'Files',
    search: 'Search files',
    noResults: 'No matching files',
    create: 'New file or folder',
    folderName: 'New Folder',
    tldrawName: 'New Tldraw'
  },
  'zh-CN': {
    files: '文件',
    search: '搜索文件',
    noResults: '未找到匹配的文件',
    create: '新建文件或文件夹',
    folderName: '新建文件夹',
    tldrawName: '新建 Tldraw 白板'
  },
  'zh-TW': {
    files: '檔案',
    search: '搜尋檔案',
    noResults: '找不到相符的檔案',
    create: '新增檔案或資料夾',
    folderName: '新增資料夾',
    tldrawName: '新增 Tldraw 白板'
  }
};

export default function WorkspaceFileSidebar() {
  const { t, i18n } = useTranslation();
  const labels = sidebarLabels[i18n.resolvedLanguage ?? 'en'] ?? sidebarLabels.en;
  const [query, setQuery] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState('appearance');
  const { addFile } = useAddFile();
  const { addFolder } = useAddFolder();
  const { currentFolderId } = useCurrentFolderId();
  const { model: tabModel } = useTabJsonModel();
  const { importBoards, boardPicker, canImport } = useImportBoards();

  function openSettings(tab: string) {
    setSettingsTab(tab);
    setSettingsVisible(true);
  }

  useEffect(() => {
    const openAgentSettings = () => openSettings('agent');
    emitter.on(events.OPEN_AGENT_MODEL_SETTINGS, openAgentSettings);
    return () => {
      emitter.off(events.OPEN_AGENT_MODEL_SETTINGS, openAgentSettings);
    };
  }, []);

  const items: MenuProps['items'] = [
    {
      key: 'board',
      icon: <Spline size={16} />,
      label: t('operation.addBoard'),
      disabled: !tabModel,
      onClick: () => {
        setQuery('');
        void addFile(t('operation.newBoardName'), 'board', tabModel, currentFolderId);
      }
    },
    {
      key: 'tldraw',
      icon: <TldrawIcon className="w-4 h-4" />,
      label: t('operation.addTldraw'),
      disabled: !tabModel,
      onClick: () => {
        setQuery('');
        void addFile(labels.tldrawName, 'tldraw', tabModel, currentFolderId);
      }
    },
    {
      key: 'note',
      icon: <FileText size={16} />,
      label: t('operation.addNote'),
      disabled: !tabModel,
      onClick: () => {
        setQuery('');
        void addFile(t('operation.newNoteName'), 'note', tabModel, currentFolderId);
      }
    },
    {
      key: 'folder',
      icon: <FolderPlus size={16} />,
      label: t('operation.addFolder'),
      disabled: !tabModel,
      onClick: () => {
        setQuery('');
        void addFolder(labels.folderName);
      }
    },
    { type: 'divider' },
    {
      key: 'import',
      icon: <Download size={16} />,
      label: t('operation.importFiles'),
      disabled: !canImport,
      onClick: () => {
        setQuery('');
        void importBoards();
      }
    }
  ];

  return (
    <aside className="rz-file-sidebar" aria-label={labels.files}>
      {boardPicker}
      <label className="rz-file-search">
        <Search size={16} strokeWidth={1.65} aria-hidden="true" />
        <input
          aria-label={labels.search}
          type="search"
          placeholder={labels.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
          }}
        />
      </label>
      <div className="rz-file-sidebar-heading">
        <h2>{labels.files}</h2>
        <Dropdown trigger={['click']} placement="bottomRight" menu={{ items }}>
          <button
            type="button"
            aria-label={labels.create}
            aria-haspopup="menu"
            title={labels.create}
          >
            <Plus size={18} strokeWidth={1.65} aria-hidden="true" />
          </button>
        </Dropdown>
      </div>
      <DraggableMenuTree
        searchQuery={query}
        noSearchResults={labels.noResults}
        label={labels.files}
      />
      <div className="rz-file-sidebar-footer">
        <button
          type="button"
          className="rz-file-sidebar-storage"
          onClick={() => openSettings('storage_path')}
          title={t('operation.storagePath')}
        >
          <HardDrive size={17} strokeWidth={1.65} aria-hidden="true" />
          <span>{t('storage.local')}</span>
        </button>
        <button
          type="button"
          aria-label={t('operation.systemSetting')}
          title={t('operation.systemSetting')}
          onClick={() => openSettings('appearance')}
        >
          <Settings size={18} strokeWidth={1.65} aria-hidden="true" />
        </button>
      </div>
      <SystemSettings
        visible={settingsVisible}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
        setSystemSettingVisible={setSettingsVisible}
        onCancel={() => setSettingsVisible(false)}
      />
    </aside>
  );
}
