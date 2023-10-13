import { Modal, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import CustomFonts from '../CustomFonts';
import { osName } from '@renderer/utils/navigator';
import StoragePathSetting from '@renderer/components/StoragePathSetting';

interface Props {
  visible: boolean;
  setSystemSettingVisible: (visible) => void;
  onCancel: () => void;
}

export default function SystemSettings({ visible, setSystemSettingVisible, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      width={800}
      open={visible}
      onCancel={onCancel}
      footer={null}
      wrapClassName={`os-is-${osName.toLowerCase()}`}
    >
      <Tabs
        tabPosition="left"
        items={[
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
          }
        ]}
      ></Tabs>
    </Modal>
  );
}
