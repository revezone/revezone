import { useCallback, useEffect } from 'react';
import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor';
import { useAtom } from 'jotai';
import { currentFileAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';
import RevedrawApp from './components/RevedrawApp';
import { getCustomFontsPathsFromLocal } from './store/localstorage';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

import './App.css';
import { ConfigProvider } from 'antd';

function App(): JSX.Element {
  const [currentFile] = useAtom(currentFileAtom);

  const renderContent = useCallback((file) => {
    if (!file) return null;

    switch (file.type) {
      case 'markdown':
        return <MarkdownEditor pageId={file.id} />;
      case 'canvas':
        return <RevedrawApp file={file} />;
      default:
        return null;
    }
  }, []);

  useEffect(() => {
    const fonts = getCustomFontsPathsFromLocal();
    fonts && window.api.batchRegisterCustomFonts(fonts);
  }, []);

  return (
    <ConfigProvider locale={enUS}>
      <div className="revenote-app-container">
        <Layout>
          <WorkspaceLoaded>{renderContent(currentFile)}</WorkspaceLoaded>
        </Layout>
      </div>
    </ConfigProvider>
  );
}

export default App;
