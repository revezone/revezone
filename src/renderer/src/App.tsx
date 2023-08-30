import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { langCodeAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import { ConfigProvider } from 'antd';
import { theme } from './utils/theme';
import { getOSName, isInRevezoneApp } from './utils/navigator';
import { submitAppEnterUserEvent } from './utils/statistics';
import MultiTabs from './components/MultiTabsWithFlexLayout';
import ResizableLayout from './components/ResizableLayout/index';

import './App.css';

const OS_NAME = getOSName();

function App(): JSX.Element {
  const [langCode] = useAtom(langCodeAtom);

  useEffect(() => {
    submitAppEnterUserEvent();
  }, []);

  const getLocale = useCallback(() => {
    switch (langCode) {
      case 'zh-CN':
        return zhCN;
      case 'zh-TW':
        return zhTW;
      default:
        return enUS;
    }
  }, [langCode]);

  return (
    <ConfigProvider locale={getLocale()} theme={theme}>
      <div
        className={`revezone-app-container os-is-${OS_NAME.toLowerCase()} ${
          isInRevezoneApp ? 'is-in-revezone-native-app' : 'is-in-browser'
        }`}
      >
        <ResizableLayout>
          <WorkspaceLoaded>
            <MultiTabs />
          </WorkspaceLoaded>
        </ResizableLayout>
      </div>
    </ConfigProvider>
  );
}

export default App;
