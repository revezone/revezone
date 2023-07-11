import { useEffect, useRef } from 'react';
import "@blocksuite/editor";
import "@blocksuite/editor/themes/affine.css";

function Editor() {

    const editorRef = useRef(null);
    const editorMountRef = useRef(false);
  
    useEffect(() => {
      if (!editorMountRef.current) {
        editorMountRef.current = true;
  
        const editor = document.createElement("simple-affine-editor");
        editorRef.current.appendChild(editor);
      }
  
    }, []);
  
    return <div className='blocksuite-editor-container' ref={editorRef}></div>;
  }
  
  export default Editor