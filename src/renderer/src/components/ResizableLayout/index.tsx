import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, GripVertical } from 'lucide-react';
import { siderbarCollapsedAtom, themeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { submitUserEvent } from '@renderer/utils/statistics';
import DraggableMenuTree from '../DraggableMenuTree/index';
import { driver } from 'driver.js';
// import { getIsUserGuideShowed, setIsUserGuideShowed } from '../../store/localstorage';
import { commonIndexeddbStorage } from '@renderer/store/commonIndexeddb';
import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import LanguageSwitcher from '../LanguageSwitcher/index';
import LeftToolBar from '../LeftToolBar/index';
import RevezoneBrand from '../RevezeonBrand/index';

import './index.css';

type Props = {
  children: ReactNode;
};

const IS_USER_GUIDE_SHOWED = 'is_user_guide_showed';

const defaultLayout = [20, 80];

export default function ResizableLayout({ children }: Props) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
  };

  const [collapsed, setCollapsed] = useAtom(siderbarCollapsedAtom);
  const [theme] = useAtom(themeAtom);
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [userGuideShow, setUserGuideShow] = useState(false);

  const userGuideHandler = useCallback(async () => {
    const isUserGuideShowed = await commonIndexeddbStorage.getCommonData(IS_USER_GUIDE_SHOWED);

    console.log('--- isUserGuideShowed ---', isUserGuideShowed);

    if (isUserGuideShowed !== 'true') {
      await commonIndexeddbStorage.updateCommonData(IS_USER_GUIDE_SHOWED, 'true');

      setModalVisible(true);
    }
  }, []);

  useEffect(() => {
    userGuideHandler();
  }, []);

  useEffect(() => {
    if (!userGuideShow) return;

    const driverObj = driver({
      showProgress: true,
      allowClose: false,
      steps: [
        {
          element: '#add-board-button',
          popover: {
            title: t('operation.addBoard'),
            description: t('description.addBoardDesc')
          }
        },
        {
          element: '#system-setting-button',
          popover: {
            title: t('operation.systemSetting'),
            description: t('description.systemSettingDesc')
          }
        },
        {
          element: '#add-tldraw-button',
          popover: {
            title: t('operation.addTldraw'),
            description: t('description.addTldrawDesc')
          }
        }
      ]
    });
    driverObj.drive();
  }, [userGuideShow]);

  const switchCollapse = useCallback(() => {
    setCollapsed(!collapsed);
    window.api?.toggleTrafficLight(collapsed);

    submitUserEvent('click_collapsebutton', { collapsed });
  }, [collapsed]);

  const onModalClose = useCallback(() => {
    setUserGuideShow(true);
    setModalVisible(false);
  }, []);

  return (
    <PanelGroup className="revezone-layout" direction="horizontal" onLayout={onLayout}>
      {!collapsed ? (
        <>
          <Panel
            defaultSize={defaultLayout[0]}
            minSize={10}
            maxSize={50}
            id="sidebar"
            order={1}
            className="relative"
          >
            <div className="revezone-topleft-toolbar">
              <PanelLeftClose
                className="panel-left-button w-5 text-current cursor-pointer"
                onClick={switchCollapse}
              />
            </div>
            <RevezoneBrand />
            <div className="flex h-full border-t">
              <LeftToolBar />
              <DraggableMenuTree />
            </div>
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
            className="w-5 text-current cursor-pointer mt-1 ml-3 absolute z-50"
          />
        )}
        {children}
      </Panel>
      <Modal
        open={modalVisible}
        title={t('language.title')}
        onOk={onModalClose}
        onCancel={onModalClose}
      >
        <p className="flex items-center mt-6">
          <span className="mr-1">{t('operation.switchLanguage')}:</span>
          <LanguageSwitcher />
        </p>
      </Modal>
    </PanelGroup>
  );
}
