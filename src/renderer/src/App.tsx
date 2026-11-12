import { lazy, Suspense, useCallback, useEffect, useLayoutEffect } from 'react';
import { useAtom } from 'jotai';
import { langCodeAtom } from './store/jotai';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import { ConfigProvider, message } from 'antd';
import { darkTheme, theme } from './utils/theme';
import { useCanvasDisplay } from './store/canvasDisplay';
import { useWindowColor } from './store/windowColor';
import { getOSName, isInRevezoneApp } from './utils/navigator';
import ResizableLayout from './components/ResizableLayout/index';
import AiWorkspace from './components/AiSidebar';
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
import useCurrentFile from './hooks/useCurrentFile';
import useFileTree from './hooks/useFileTree';
import { RevezoneFile, RevezoneFileTree } from './types/file';
import { Model } from 'flexlayout-react';
import { useTranslation } from 'react-i18next';

let openFileSuccessListenerRegistered = false;
let deepLinkUrlOpened = false;
let associatedFileOpened = false;

const OS_NAME = getOSName();

function App(): JSX.Element {
  const [langCode] = useAtom(langCodeAtom);
  const { i18n } = useTranslation();
  const { color } = useWindowColor();
  const { display: canvasDisplay } = useCanvasDisplay();
  const { addFile } = useAddFile();
  const { model: tabModel, updateTabJsonModelWhenCurrentFileChanged } = useTabJsonModel();
  const { updateCurrentFile } = useCurrentFile();
  const { fileTree } = useFileTree();

  useLayoutEffect(() => {
    void i18n.changeLanguage(langCode);
  }, [i18n, langCode]);

  useLayoutEffect(() => {
    document.documentElement.dataset.revezoneColor = color;
  }, [color]);

  useLayoutEffect(() => {
    document.documentElement.dataset.revezoneCanvasDisplay = canvasDisplay;
  }, [canvasDisplay]);

  const doOpenFile = useCallback((path: string, fileData: string, tabModel: Model) => {
    const fileNameWithSuffix = getFilenameFromPath(path);
    const fileName = fileNameWithSuffix && getFileNameWithoutSuffix(fileNameWithSuffix);
    const suffix = fileNameWithSuffix && getFileSuffix(fileNameWithSuffix);
    const fileType = suffix && getFileTypeFromSuffix(suffix);

    if (fileName && fileType) {
      addFile(fileName, fileType, tabModel, 'root', fileData);
    } else {
      message.error(`File ${path} unrecognized!`);
    }
  }, []);

  useEffect(() => {
    if (!tabModel || openFileSuccessListenerRegistered) return;

    // avoid listener register multiple times
    openFileSuccessListenerRegistered = true;

    window.api?.openFileSuccess((event, path, fileData) => {
      doOpenFile(path, fileData, tabModel);
    });
  }, [tabModel]);

  const updateCurrentFileFromDeepLinkingUrl = useCallback(
    async (link: string, fileTree: RevezoneFileTree, tabModel: Model) => {
      const fileId = link?.split('revezone://')[1];
      const file = fileTree[fileId]?.data as RevezoneFile;

      if (!file) {
        message.error(`File ${link} not existed!`);
        return;
      }

      await updateCurrentFile(file);

      updateTabJsonModelWhenCurrentFileChanged(file, tabModel);
    },
    []
  );

  useEffect(() => {
    if (!tabModel || !(fileTree && JSON.stringify(fileTree) !== '{}')) {
      return;
    }

    if (!deepLinkUrlOpened) {
      deepLinkUrlOpened = true;
      const deepLinkingUrl = window.electron?.process.env.DEEP_LINKING_URL;

      deepLinkingUrl && updateCurrentFileFromDeepLinkingUrl(deepLinkingUrl, fileTree, tabModel);
    }

    if (!associatedFileOpened) {
      associatedFileOpened = true;

      const openFilePath = window.electron?.process.env.OPEN_FILE_PATH;
      const fileData = window.electron?.process.env.OPEN_FILE_DATA;

      openFilePath && fileData && doOpenFile(openFilePath, fileData, tabModel);
    }

    window.api?.removeAllRevezoneLinkListeners();

    window.api?.openRevezoneLinkSuccess(async (event, link) => {
      link && updateCurrentFileFromDeepLinkingUrl(link, fileTree, tabModel);
    });
  }, [fileTree, tabModel]);

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
    <ConfigProvider locale={getLocale()} theme={color === 'dark' ? darkTheme : theme}>
      <div
        className={`revezone-app-container os-is-${OS_NAME.toLowerCase()} ${
          isInRevezoneApp ? 'is-in-revezone-native-app' : 'is-in-browser'
        }`}
      >
        <ResizableLayout>
          <AiWorkspace>
            <Suspense fallback={null}>
              <MultiTabs />
            </Suspense>
          </AiWorkspace>
        </ResizableLayout>
      </div>
    </ConfigProvider>
  );
}

export default App;
