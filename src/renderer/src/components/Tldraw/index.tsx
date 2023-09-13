import { useState, useLayoutEffect, useEffect } from 'react';
import { RevezoneFile } from '@renderer/types/file';
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  throttle,
  useEditor,
  Editor
} from '@tldraw/tldraw';

import '@tldraw/tldraw/tldraw.css';

interface Props {
  file: RevezoneFile;
}

export default function ReveTldraw(props: Props) {
  const { file } = props;
  //   const editor = useEditor();
  const [editor, setEditor] = useState<Editor>();

  useEffect(() => {
    editor?.store?.listen((entry) => {
      //   entry; // { changes, source }
      console.log('--- store change ---', entry, editor.store.getSnapshot());
    });
  }, [editor]);

  //   const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));

  //   useLayoutEffect(() => {
  //     // Each time the store changes, run the (debounced) persist function
  //     const cleanupFn = store.listen(
  //       throttle(() => {
  //         const snapshot = store.getSnapshot();
  //         console.log('--- snapshot ---', snapshot);
  //       }, 500)
  //     );

  //     return () => {
  //       cleanupFn();
  //     };
  //   }, [store]);

  const onUiEvent = (name, data) => {
    console.log('--- onUiEvent ---', name, data);
  };

  return (
    <div className="tldraw__editor w-full h-full">
      <Tldraw
        persistenceKey={file.id}
        autoFocus
        onUiEvent={onUiEvent}
        onMount={(editor) => {
          setEditor(editor);
        }}
      />
    </div>
  );
}
