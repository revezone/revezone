import { IJsonModel, Model, Layout } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import NoteEditor from '@renderer/components/NoteEditor';
import RevedrawApp from '../RevedrawApp';
import WelcomePage from '../WelcomePage';
import { useCallback, useEffect, useState } from 'react';
import useTabList from '@renderer/hooks/useTabList';

import './index.css';

export default function MultiTabs() {
  const { tabIndex, tabList } = useTabList();
  const [model, setModel] = useState<Model>();

  console.log('--- tabIndex ---', tabIndex);

  useEffect(() => {
    const json: IJsonModel = {
      global: {},
      layout: {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            weight: 10,
            selected: tabIndex,
            children: tabList
          }
        ]
      }
    };

    const _model = Model.fromJson(json);

    setModel(_model);
  }, [tabIndex, tabList]);

  const renderContent = useCallback((file) => {
    console.log('--- renderContent ---', file);

    switch (file?.type) {
      case 'note':
        return <NoteEditor file={file} />;
      case 'board':
        return <RevedrawApp file={file} />;
      default:
        return <WelcomePage />;
    }
  }, []);

  const factory = useCallback((node) => {
    const file = node.getConfig();

    return <div className="tab_content">{renderContent(file)}</div>;
  }, []);

  return model ? <Layout model={model} factory={factory} /> : null;
}
