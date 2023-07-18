import { useCallback } from 'react';
import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor';
import { useAtom } from 'jotai';
import { currentFileAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';

import './App.css';

function App(): JSX.Element {
  const [currentFile] = useAtom(currentFileAtom);

  const renderContent = useCallback(
    (currentFileType) => {
      switch (currentFileType) {
        case 'markdown':
          return <MarkdownEditor pageId={currentFile?.id} />;
        case 'canvas':
          return 'canvas';
        default:
          return null;
      }
    },
    [currentFile]
  );

  return (
    <div className="revenote-app-container">
      <Layout>
        <WorkspaceLoaded>{renderContent(currentFile?.type)}</WorkspaceLoaded>
      </Layout>
    </div>
  );
}

export default App;
