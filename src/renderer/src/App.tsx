import { useCallback, useEffect } from 'react';
import CustomLayout from './components/CustomLayout';
import NoteEditor from './components/NoteEditor';
import { useAtom } from 'jotai';
import { currentFileAtom, langCodeAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';
import RevedrawApp from './components/RevedrawApp';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import WelcomePage from './components/WelcomePage';
import { ConfigProvider } from 'antd';
import { theme } from './utils/theme';
import { getOSName, isInRevezoneApp } from './utils/navigator';

import './App.css';

const OS_NAME = getOSName();

function App(): JSX.Element {
  const [currentFile] = useAtom(currentFileAtom);
  const [langCode] = useAtom(langCodeAtom);

  const renderContent = useCallback((file) => {
    switch (file?.type) {
      case 'note':
        return <NoteEditor file={file} />;
      case 'board':
        return <RevedrawApp file={file} />;
      default:
        return <WelcomePage />;
    }
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
        <CustomLayout>
          <WorkspaceLoaded>{renderContent(currentFile)}</WorkspaceLoaded>
        </CustomLayout>
      </div>
    </ConfigProvider>
  );
}

export default App;
