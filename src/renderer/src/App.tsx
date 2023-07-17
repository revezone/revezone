import { useEffect, useState } from 'react';
import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor/index';
import { emitter, events } from './store/eventemitter';

import './App.css';

function App(): JSX.Element {
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  useEffect(() => {
    emitter.on(events.WORKSPACE_LOADED, () => {
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
