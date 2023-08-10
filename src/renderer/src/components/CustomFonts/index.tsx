import { useEffect, useCallback, useState } from 'react';
import { Button, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { useUpdate } from 'ahooks';
import {
  setBoardCustomFontSwitchToLocal,
  getBoardCustomFontSwitchFromLocal,
  getBoardCustomFontFromLocal,
  setBoardCustomFontToLocal
} from '@renderer/store/localstorage';
import { isInRevezoneApp } from '@renderer/utils/navigator';
import DownloadApp from '../DownloadApp/index';

interface Font {
  name: string;
  nameWithSuffix: string;
  path: string;
}

const registeredFontsStr = window.electron?.process.env.registeredFonts;
const registeredFonts = registeredFontsStr && JSON.parse(registeredFontsStr);

const CustomFonts = () => {
  const { t } = useTranslation();
  const update = useUpdate();

  const [fonts, setFonts] = useState<Font[]>(registeredFonts);
  const [boardCustomFontSwitch, setBoardCustomFontSwitch] = useState(
    getBoardCustomFontSwitchFromLocal() === 'true'
  );
  const [boardCustomFont, setBoardCustomFont] = useState(getBoardCustomFontFromLocal());

  console.log('--- registeredFonts ---', registeredFonts);

  const loadCustomFonts = useCallback(() => {
    window.api && window.api.loadCustomFonts();
  }, []);

  useEffect(() => {
    setBoardCustomFontSwitchToLocal(boardCustomFontSwitch);
  }, [boardCustomFontSwitch]);

  useEffect(() => {
    setBoardCustomFontToLocal(boardCustomFont);
  }, [boardCustomFont]);

  useEffect(() => {
    window.api &&
      window.api.onLoadCustomFontSuccess(async (event, newFonts) => {
        const _fonts = registeredFonts;

        newFonts.forEach((font) => {
          if (!_fonts.find((_font) => _font.name === font.name)) {
            _fonts.push(font);
          }
        });

        console.log('--- newFonts ---', newFonts);
        console.log('_fonts', _fonts);

        setFonts(_fonts);

        setTimeout(() => {
          update();
        }, 0);
      });
  }, []);

  if (!isInRevezoneApp) {
    return (
      <div className="text-gray-500 h-36 flex items-center">
        <span className="mr-2">线上版只提供体验功能，自定义字体请下载桌面应用</span>
        <DownloadApp from="systemsetting" />
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y">
        <div className="w-full py-2">
          {fonts?.length ? (
            <>
              <p className="mr-2 text-sm font-medium">已加载字体:</p>
              <div className="pl-4 overflow-scroll" style={{ maxHeight: 200 }}>
                {fonts?.map((font) => {
                  return (
                    <div key={font.name} className="py-2">
                      <p className="text-sm text-gray-700">{font.name}</p>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{font.path}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <span className="text-gray-500 pl-4">暂无自定义字体</span>
          )}
          <div className="pl-4 pt-2">
            <Button size="small" onClick={loadCustomFonts}>
              {t('customFontModal.load')}
            </Button>
          </div>
        </div>

        <div className="py-2">
          <p className="mr-2 mb-2 text-sm font-medium">开启画布自定义字体:</p>
          <p className="mb-3">
            <Switch
              className="bg-gray-300"
              checked={boardCustomFontSwitch}
              onChange={(value) => {
                setBoardCustomFontSwitch(value);
                setBoardCustomFontToLocal('');
              }}
            ></Switch>
          </p>
          {boardCustomFontSwitch ? (
            <p className="mb-2">
              <Select
                className="w-80"
                value={boardCustomFont}
                onChange={(value) => setBoardCustomFont(value)}
              >
                {fonts.map((font) => {
                  return (
                    <Select.Option key={font.name} value={font.name}>
                      {font.name}
                    </Select.Option>
                  );
                })}
              </Select>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CustomFonts;
