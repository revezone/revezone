import { lazy, useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { langCodeAtom } from './store/jotai';
import WorkspaceLoaded from './components/WorkspaceLoaded';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import { ConfigProvider, message } from 'antd';
import { theme } from './utils/theme';
import { getOSName, isInRevezoneApp } from './utils/navigator';
import { submitAppEnterUserEvent } from './utils/statistics';
import ResizableLayout from './components/ResizableLayout/index';
import useAddFile from '@renderer/hooks/useAddFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';

const MultiTabs = lazy(() => import('./components/MultiTabsWithFlexLayout'));

import './App.css';
import {
  getFilenameFromPath,
  getFileNameWithoutSuffix,
  getFileSuffix,
  getFileTypeFromSuffix
} from './utils/file';

let openFileSuccessListenerRegistered = false;

const OS_NAME = getOSName();

function App(): JSX.Element {
  const [langCode] = useAtom(langCodeAtom);
  const { addFile } = useAddFile();
  const { model: tabModel } = useTabJsonModel();

  useEffect(() => {
    submitAppEnterUserEvent();
  }, []);

  useEffect(() => {
    if (!tabModel || openFileSuccessListenerRegistered) return;

    console.log('--- tabModel change ---');

    // avoid listener register multiple times
    openFileSuccessListenerRegistered = true;

    window.api?.openFileSuccess((event, path, fileData) => {
      const fileNameWithSuffix = getFilenameFromPath(path);
      const fileName = fileNameWithSuffix && getFileNameWithoutSuffix(fileNameWithSuffix);
      const suffix = fileNameWithSuffix && getFileSuffix(fileNameWithSuffix);
      const fileType = suffix && getFileTypeFromSuffix(suffix);

      console.log('--- openFileSuccess ---', path, fileName, suffix, fileType, fileData);

      if (fileName && fileType) {
        addFile(fileName, fileType, tabModel, 'root', fileData);
      } else {
        message.error(`File ${path} unrecognized!`);
      }
    });
  }, [tabModel]);

  const getLocale = useCallback(() => {
    switch (langCode) {
      case 'zh-CN':
        return zhCN;
      case 'zh-TW':
        return zhTW;
      default:
        return enUS;
    }
  }, [langCode]);

  return (
    <ConfigProvider locale={getLocale()} theme={theme}>
      <div
        className={`revezone-app-container os-is-${OS_NAME.toLowerCase()} ${
          isInRevezoneApp ? 'is-in-revezone-native-app' : 'is-in-browser'
        }`}
      >
        <ResizableLayout>
          <WorkspaceLoaded>
            <MultiTabs />
          </WorkspaceLoaded>
        </ResizableLayout>
      </div>
    </ConfigProvider>
  );
}

export default App;
