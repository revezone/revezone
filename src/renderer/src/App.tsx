import Versions from './components/Versions'
import icons from './assets/icons.svg'


import "@blocksuite/editor";
import "@blocksuite/editor/themes/affine.css";
import { useEffect, useRef } from 'react';



function App() {

  const editorMountRef = useRef(false);

  useEffect(() => {
    if (!editorMountRef.current) {
      editorMountRef.current = true;

      const editor = document.createElement("simple-affine-editor");
      document.body.appendChild(editor);
    }

  }, []);

  return null;
}

export default App
