import { Modal, Radio, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import CustomFonts from '../CustomFonts';
import LanguageSwitcher from '../LanguageSwitcher';
import { isInRevezoneApp, osName } from '@renderer/utils/navigator';
import StoragePathSetting from '@renderer/components/StoragePathSetting';
import AgentModelSettings from './AgentModelSettings';
import { getAgentModelStrings } from './agentModelStrings';
import {
  canvasDisplayLabels,
  canvasDisplayOptions,
  useCanvasDisplay
} from '@renderer/store/canvasDisplay';
import {
  useWindowColor,
  windowColorLabels,
  windowColorPreferences
} from '@renderer/store/windowColor';

interface Props {
  visible: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  setSystemSettingVisible: (visible) => void;
  onCancel: () => void;
}

export default function SystemSettings({
  visible,
  activeTab,
  onTabChange,
  setSystemSettingVisible,
  onCancel
}: Props) {
  const { t, i18n } = useTranslation();
  const labels = windowColorLabels(i18n.language);
  const canvasLabels = canvasDisplayLabels(i18n.language);
  const { preference, setColor } = useWindowColor();
  const { display, setDisplay } = useCanvasDisplay();

  return (
    <Modal
      width={800}
      open={visible}
      forceRender={activeTab === 'agent'}
      onCancel={onCancel}
      footer={null}
      wrapClassName={`os-is-${osName.toLowerCase()}`}
    >
      <Tabs
        tabPosition="left"
        activeKey={activeTab}
        onChange={onTabChange}
        items={[
          {
            key: 'appearance',
            label: labels.appearance,
            children: (
              <>
                <fieldset className="rz-appearance-setting">
                  <legend>{labels.color}</legend>
                  <Radio.Group
                    value={preference}
                    onChange={(event) => setColor(event.target.value)}
                    data-testid="window-color-settings"
                  >
                    {windowColorPreferences.map((value) => (
                      <Radio key={value} value={value}>
                        {labels[value]}
                      </Radio>
                    ))}
                  </Radio.Group>
                </fieldset>
                <fieldset
                  className="rz-appearance-setting"
                  aria-describedby="rz-canvas-display-help"
                >
                  <legend>{canvasLabels.title}</legend>
                  <Radio.Group
                    value={display}
                    onChange={(event) => setDisplay(event.target.value)}
                    data-testid="canvas-display"
                  >
                    {canvasDisplayOptions.map((value) => (
                      <Radio key={value} value={value}>
                        {canvasLabels[value]}
                      </Radio>
                    ))}
                  </Radio.Group>
                  <p id="rz-canvas-display-help">{canvasLabels.description}</p>
                </fieldset>
              </>
            )
          },
          {
            key: 'language',
            label: t('operation.switchLanguage'),
            children: <LanguageSwitcher />
          },
          {
            key: 'custom_fonts',
            label: t('menu.customFont'),
            children: <CustomFonts setSystemSettingVisible={setSystemSettingVisible}></CustomFonts>
          },
          {
            key: 'storage_path',
            label: t('operation.storagePath'),
            children: (
              <div>
                <StoragePathSetting />
              </div>
            )
          },
          ...(window.revezoneModel
            ? [
                {
                  key: 'agent',
                  label: getAgentModelStrings(i18n.language).tab,
                  children: <AgentModelSettings active={visible && activeTab === 'agent'} />
                }
              ]
            : []),
          {
            key: 'links',
            label: t('links.title'),
            children: (
              <ul className="space-y-2">
                <li>
                  <a href="https://revezone.com" target="_blank" rel="noreferrer">
                    {t('links.website')}
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/revezone/revezone/issues/new"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('help.issue')}
                  </a>
                </li>
                {!isInRevezoneApp && (
                  <li>
                    <a
                      href="https://github.com/revezone/revezone/releases"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('links.downloadApp')}
                    </a>
                  </li>
                )}
              </ul>
            )
          }
        ]}
      ></Tabs>
    </Modal>
  );
}
