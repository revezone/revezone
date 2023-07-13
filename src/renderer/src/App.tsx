import Layout from './components/Layout';
import Editor from './components/Editor/index';

import './App.css';

function App() {

  return <div className='revenote-app-container'>
    <Layout>
      <Editor />
    </Layout>
  </div>;
}

export default App
