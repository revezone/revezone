import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor/index';
import { emmiter } from './store/eventemitter';

import './App.css';
import { useEffect, useState } from 'react';

function App(): JSX.Element {
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  useEffect(() => {
    emmiter.on('workspace_loaded', () => {
      setWorkspaceLoaded(true);
    });
  }, []);

  return (
    <div className="revenote-app-container">
      <Layout>{workspaceLoaded ? <MarkdownEditor /> : null}</Layout>
    </div>
  );
}

export default App;
