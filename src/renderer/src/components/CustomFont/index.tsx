import { useEffect, useCallback, useState } from 'react';
import { Button, Form, Input } from 'antd';

export default function CustomFont() {
  const [fontName, setFontName] = useState();
  const [fontFamilyName, setFontFamilyName] = useState<string>();

  const loadCustomFonts = useCallback(() => {
    window.api.loadCustomFonts();
  }, []);

  useEffect(() => {
    window.api.onLoadCustomFontSuccess(async (event, _fontName, _fontPath) => {
      console.log('onLoadCustomFontSuccess', event, _fontName, _fontPath);
      setFontName(_fontName);
      setFontFamilyName(_fontName);
    });
  }, []);

  return (
    <Form labelCol={{ span: 6 }}>
      <Form.Item label="Load Font">
        <p>
          <span>{fontName}</span>
          <Button onClick={loadCustomFonts}>Load</Button>
        </p>
      </Form.Item>
      <Form.Item label="Font Name">
        <Input value={fontFamilyName} onChange={(e) => setFontFamilyName(e.target.value)} />
      </Form.Item>
    </Form>
  );
}
