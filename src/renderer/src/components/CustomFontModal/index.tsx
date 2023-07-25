import { useEffect, useCallback, useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { addCustomFontToLocal } from '@renderer/store/localstorage';

interface Props {
  open: boolean;
  closeModal: () => void;
}

const CustomFontModal = (props: Props) => {
  const { open, closeModal } = props;

  const [fontName, setFontName] = useState();
  const [fontPath, setFontPath] = useState();
  const [fontFamilyName, setFontFamilyName] = useState<string>();

  const loadCustomFonts = useCallback(() => {
    window.api.loadCustomFonts();
  }, []);

  useEffect(() => {
    window.api.onLoadCustomFontSuccess(async (event, _fontName, _fontPath) => {
      console.log('onLoadCustomFontSuccess', event, _fontName, _fontPath);
      setFontName(_fontName);
      setFontPath(_fontPath);
      setFontFamilyName(_fontName);
    });
  }, []);

  const onOk = useCallback(() => {
    if (!fontPath) {
      message.error('Please load font file');
      return;
    }

    if (!fontFamilyName) {
      message.error('Font name cannot be empty!');
      return;
    }

    window.api.registryCustomFont(fontFamilyName, fontPath);

    addCustomFontToLocal(fontFamilyName);

    closeModal();
  }, [fontPath, fontFamilyName]);

  return (
    <Modal title="Custom Fonts" open={open} onOk={onOk} onCancel={() => closeModal()}>
      <Form labelCol={{ span: 6 }}>
        <Form.Item label="Load Font File">
          <p>
            <span>{fontName}</span>
            <Button onClick={loadCustomFonts}>Load</Button>
          </p>
        </Form.Item>
        <Form.Item label="Font Name">
          <Input value={fontFamilyName} onChange={(e) => setFontFamilyName(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CustomFontModal;
