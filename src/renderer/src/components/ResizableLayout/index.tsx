import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle
} from 'react-resizable-panels';
import { type ReactNode, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { siderbarCollapsedAtom } from '@renderer/store/jotai';
import WorkspaceFileSidebar from '../WorkspaceFileSidebar';
import './index.css';

export default function ResizableLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const { t } = useTranslation();
  const sidebar = useRef<ImperativePanelHandle>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);

  const toggleSidebar = () => {
    if (collapsed) sidebar.current?.expand();
    else sidebar.current?.collapse();
    requestAnimationFrame(() => {
      if (collapsed) toggleButton.current?.focus();
      else reopenButton.current?.focus();
    });
  };

  return (
    <PanelGroup className="revezone-layout" direction="horizontal">
      <Panel
        ref={sidebar}
        id="sidebar"
        order={1}
        defaultSize={20}
        minSize={12}
        maxSize={50}
        collapsible
        onCollapse={setCollapsed}
        className="rz-shell-sidebar"
      >
        <div hidden={collapsed} id="rz-files-sidebar" className="rz-shell-sidebar-inner">
          <div className="rz-shell-sidebar-titlebar">
            <button
              ref={toggleButton}
              type="button"
              className="rz-shell-icon-button"
              title={t('operation.hideFiles')}
              aria-label={t('operation.hideFiles')}
              aria-controls="rz-files-sidebar"
              aria-expanded
              onClick={toggleSidebar}
            >
              <PanelLeftClose size={16} aria-hidden="true" />
            </button>
          </div>
          <WorkspaceFileSidebar />
        </div>
      </Panel>
      <PanelResizeHandle className="rz-shell-divider" aria-label={t('operation.resizeFiles')} />
      <Panel defaultSize={80} order={2} className="rz-shell-main">
        {collapsed && (
          <button
            ref={reopenButton}
            type="button"
            className="rz-shell-icon-button rz-shell-reopen-files"
            title={t('operation.showFiles')}
            aria-label={t('operation.showFiles')}
            aria-controls="rz-files-sidebar"
            aria-expanded={false}
            onClick={toggleSidebar}
          >
            <PanelLeftOpen size={16} aria-hidden="true" />
          </button>
        )}
        {children}
      </Panel>
    </PanelGroup>
  );
}
