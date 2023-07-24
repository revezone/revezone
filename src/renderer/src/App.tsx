import { useCallback } from 'react';
import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor';
import { useAtom } from 'jotai';
import { currentFileAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';
import Revedraw from './components/Revedraw';

import './App.css';

function App(): JSX.Element {
  const [currentFile] = useAtom(currentFileAtom);

  const renderContent = useCallback((file) => {
    if (!file) return null;

    switch (file.type) {
      case 'markdown':
        return <MarkdownEditor pageId={file.id} />;
      case 'canvas':
        return <Revedraw file={file} />;
      default:
        return null;
    }
  }, []);

  return (
    <div className="revenote-app-container">
      <Layout>
        <WorkspaceLoaded>{renderContent(currentFile)}</WorkspaceLoaded>
      </Layout>
    </div>
  );
}

export default App;
