import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const canvasDisplayOptions = ['original', 'follow-window'] as const;
type CanvasDisplay = (typeof canvasDisplayOptions)[number];

const canvasDisplayAtom = atomWithStorage<CanvasDisplay>(
  'revezone.canvas.display',
  'original',
  undefined,
  { unstable_getOnInit: true }
);

export function useCanvasDisplay() {
  const [saved, setDisplay] = useAtom(canvasDisplayAtom);
  const display = canvasDisplayOptions.includes(saved) ? saved : 'original';
  return { display, setDisplay };
}

export function canvasDisplayLabels(language: string) {
  const locale = language.toLowerCase();
  if (locale === 'zh-tw' || locale === 'zh-hk') {
    return {
      title: '畫布顯示',
      original: '原始配色',
      'follow-window': '跟隨視窗',
      description: '僅影響 Excalidraw 和 tldraw 的螢幕顯示。'
    };
  }
  if (locale.startsWith('zh')) {
    return {
      title: '画布显示',
      original: '原始配色',
      'follow-window': '跟随窗口',
      description: '仅影响 Excalidraw 和 tldraw 的屏幕显示。'
    };
  }
  return {
    title: 'Canvas display',
    original: 'Original colors',
    'follow-window': 'Follow window',
    description: 'Applies to the on-screen view in Excalidraw and tldraw.'
  };
}
