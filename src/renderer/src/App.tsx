import Layout from './components/CustomLayout';
import MarkdownEditor from './components/MarkdownEditor/index';

import './App.css';

function App(): JSX.Element {
  return (
    <div className="revenote-app-container">
      <Layout>
        <MarkdownEditor />
      </Layout>
    </div>
  );
}

export default App;
