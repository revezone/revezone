import { useSyncExternalStore } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const windowColorPreferences = ['system', 'light', 'dark'] as const;
type ColorPreference = (typeof windowColorPreferences)[number];

// Keep the saved preference from the note appearance menu.
const colorAtom = atomWithStorage<ColorPreference>('revezone.note.color', 'system', undefined, {
  unstable_getOnInit: true
});

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function subscribeToSystemColor(listener: () => void) {
  systemDark.addEventListener('change', listener);
  return () => systemDark.removeEventListener('change', listener);
}

function systemColor() {
  return systemDark.matches ? 'dark' : 'light';
}

export function useWindowColor() {
  const [savedColor, setColor] = useAtom(colorAtom);
  const preference = windowColorPreferences.includes(savedColor) ? savedColor : 'system';
  const system = useSyncExternalStore(subscribeToSystemColor, systemColor);
  const color = preference === 'system' ? system : preference;
  return { preference, color, setColor };
}

export function windowColorLabels(language: string) {
  const locale = language.toLowerCase();
  if (locale === 'zh-tw' || locale === 'zh-hk') {
    return {
      appearance: '外觀',
      color: '視窗配色',
      system: '跟隨系統',
      light: '淺色',
      dark: '深色'
    };
  }
  if (locale.startsWith('zh')) {
    return {
      appearance: '外观',
      color: '窗口配色',
      system: '跟随系统',
      light: '浅色',
      dark: '深色'
    };
  }
  return {
    appearance: 'Appearance',
    color: 'Window color',
    system: 'Follow system',
    light: 'Light',
    dark: 'Dark'
  };
}
