import { useEffect, useCallback, useState } from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import './index.css';

interface Props {
  open: boolean;
  closeModal: () => void;
}

interface Font {
  name: string;
  sourcePath: string;
  fontPath: string;
}

const CustomFontModal = (props: Props) => {
  const { open, closeModal } = props;

  const { t } = useTranslation();

  const [fonts, setFonts] = useState<Font[]>([]);

  const loadCustomFonts = useCallback(() => {
    window.api && window.api.loadCustomFonts();
  }, []);

  useEffect(() => {
    window.api &&
      window.api.onLoadCustomFontSuccess(async (event, fontsInfo) => {
        console.log('--- fontsInfo ---', fontsInfo);
        setFonts(fontsInfo);
      });
  }, []);

  const onOk = useCallback(() => {
    closeModal();
  }, []);

  return (
    <Modal
      className="revezone-custom-font-modal"
      title={t('customFontModal.title')}
      open={open}
      onOk={onOk}
      onCancel={() => closeModal()}
    >
      <Button onClick={loadCustomFonts}>{t('customFontModal.load')}</Button>
      <table className="table-auto">
        <thead>
          <tr>
            <th>字体名称</th>
            <th>原始路径</th>
            <th>目标路径</th>
          </tr>
        </thead>
        <tbody>
          {fonts?.map((font) => (
            <tr key={font.fontPath}>
              <td>{font.name}</td>
              <td>{font.sourcePath}</td>
              <td>{font.fontPath}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
};

export default CustomFontModal;
