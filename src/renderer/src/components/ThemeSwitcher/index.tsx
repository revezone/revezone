import { useAtom } from 'jotai';
import { themeAtom } from '@renderer/store/jotai';
import { Select } from 'antd';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useAtom(themeAtom);

  return (
    <Select
      onChange={(value) => setTheme(value)}
      onClick={(e) => e.stopPropagation()}
      bordered={false}
      value={theme}
    >
      <Select.Option key="light" value="light">
        light
      </Select.Option>
      <Select.Option key="dark" value="dark">
        dark
      </Select.Option>
    </Select>
  );
}
