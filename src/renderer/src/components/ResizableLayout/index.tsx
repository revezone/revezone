import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ReactNode, useCallback } from 'react';
import { PanelLeftClose, PanelLeftOpen, GripVertical } from 'lucide-react';
import { siderbarCollapsedAtom, themeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
// import LanguageSwitcher from '../LanguageSwitcher';
// import ThemeSwitcher from '../ThemeSwitcher';

import './index.css';
import BottomToolbar from '../BottomToolbar/index';
import { submitUserEvent } from '@renderer/utils/statistics';
import DraggableMenuTree from '../DraggableMenuTree/index';

type Props = {
  children: ReactNode;
};

const defaultLayout = [20, 80];

export default function ClientComponent({ children }: Props) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
  };

  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme] = useAtom(themeAtom);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);

    submitUserEvent('click_collapsebutton', { collapsed });
  }, [collapsed]);

  return (
    <PanelGroup className="revezone-layout" direction="horizontal" onLayout={onLayout}>
      {!collapsed ? (
        <>
          <Panel defaultSize={defaultLayout[0]} minSize={0.2} maxSize={50} id="sidebar" order={1}>
            <div className="revezone-topleft-toolbar">
              <PanelLeftClose
                className="panel-left-button w-5 text-current cursor-pointer"
                onClick={switchCollapse}
              />
            </div>
            <DraggableMenuTree />
            <BottomToolbar />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-100 flex justify-center items-center">
            <div className="flex flex-col">
              <GripVertical className="w-3 h-3 text-gray-500" />
            </div>
          </PanelResizeHandle>
        </>
      ) : null}
      <Panel defaultSize={defaultLayout[1]} order={2}>
        {collapsed && (
          <PanelLeftOpen
            onClick={switchCollapse}
            className="w-5 text-current cursor-pointer mt-3 ml-3 absolute z-50"
          />
        )}
        {children}
      </Panel>
    </PanelGroup>
  );
}
