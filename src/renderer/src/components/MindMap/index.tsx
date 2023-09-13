import MindElixir from 'mind-elixir';
import { useEffect, useRef } from 'react';

// import example from 'mind-elixir/dist/example1';

// let mind = new MindElixir(options);

// mind.install(plugin); // install your plugin

// // create new map data
// const data = MindElixir.new('new topic');
// // or `example`
// // or the data return from `.getData()`
// mind.init(data);

// // get a node
// MindElixir.E('node-id');

export default function MindMap() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const options = {
      el: containerRef.current, // or HTMLDivElement
      direction: MindElixir.LEFT,
      draggable: true, // default true
      contextMenu: true, // default true
      toolBar: true, // default true
      nodeMenu: true, // default true
      keypress: true, // default true
      locale: 'en', // [zh_CN,zh_TW,en,ja,pt,ru] waiting for PRs
      overflowHidden: false, // default false
      mainLinkStyle: 2, // [1,2] default 1
      contextMenuOption: {
        focus: true,
        link: true,
        extend: [
          {
            name: 'Node edit',
            onclick: () => {
              alert('extend menu');
            }
          }
        ]
      },
      before: {
        insertSibling(el, obj) {
          return true;
        },
        async addChild(el, obj) {
          //   await sleep();
          return true;
        }
      }
    };

    const mind = new MindElixir(options);

    // mind.install(plugin); // install your plugin

    // create new map data
    const data = MindElixir.new('new topic');
    // or `example`
    // or the data return from `.getData()`
    mind.init(data);

    // // get a node
    // MindElixir.E('node-id');
  }, []);

  return <div ref={containerRef}></div>;
}
