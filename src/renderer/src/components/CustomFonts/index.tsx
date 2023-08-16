import { useEffect, useCallback, useState } from 'react';
import { Button, Select, Switch, Popconfirm } from 'antd';
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
import { Font } from '@renderer/types/file';
import { XSquare } from 'lucide-react';

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

  const customFontsChanged = useCallback(async (event, newFonts) => {
    setFonts(newFonts);

    // clear board custom font if font was removed
    if (!newFonts.find((font) => font.name === boardCustomFont)) {
      setBoardCustomFont(null);
    }

    setTimeout(() => {
      update();
    }, 0);
  }, []);

  useEffect(() => {
    window.api && window.api.onLoadCustomFontSuccess(customFontsChanged);
  }, []);

  useEffect(() => {
    window.api && window.api.onRemoveCustomFontSuccess(customFontsChanged);
  }, []);

  const removeCustomFont = (fontPath: string) => {
    window.api.removeCustomFont(fontPath);
  };

  if (!isInRevezoneApp) {
    return (
      <div className="text-gray-500 h-36 flex items-center">
        <span className="mr-2">{t('customFont.onlineVersionTip')}</span>
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
              <p className="mr-2 font-normal">{t('customFont.fontsLoaded')}:</p>
              <div className="pl-4 overflow-scroll" style={{ maxHeight: 200 }}>
                {fonts?.map((font) => {
                  return (
                    <div key={font.name} className="py-2">
                      <p className=" text-gray-700 flex items-center">
                        <span>{font.name}</span>
                        <Popconfirm
                          title={t('customFont.deleteFont')}
                          description={`${t('customFont.confirmDeleteFont')} ${font.name} ?`}
                          onConfirm={() => {
                            removeCustomFont(font.path);
                          }}
                          okText="Yes"
                          cancelText="No"
                        >
                          <XSquare className="w-4 h-4 cursor-pointer ml-2"></XSquare>
                        </Popconfirm>
                      </p>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{font.path}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <span className="text-gray-500 pl-4">{t('customFont.emptyTip')}</span>
          )}
          <div className="pt-2">
            <Button size="small" onClick={loadCustomFonts}>
              {t('customFont.loadFontFile')}
            </Button>
            <p className="mt text-orange-300">{t('customFont.fontFirstLoadTip')}</p>
          </div>
        </div>

        <div className="py-2">
          <p className="mr-2 mb-2 font-normal">{t('customFont.enableCustomFontInBoard')}:</p>
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
