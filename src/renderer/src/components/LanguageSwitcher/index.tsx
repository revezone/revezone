import { langCodeList } from '@renderer/i18n';
import { Select } from 'antd';
import { langCodeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const [langCode, setLangCode] = useAtom(langCodeAtom);
  const { i18n } = useTranslation();

  const onChange = useCallback((code: string) => {
    setLangCode(code);
    i18n.changeLanguage(code);
  }, []);

  return (
    <Select size="small" defaultValue={langCode} onChange={onChange}>
      {langCodeList.map((item) => {
        return (
          <Select.Option key={item.key} value={item.key}>
            {item.label}
          </Select.Option>
        );
      })}
    </Select>
  );
}
