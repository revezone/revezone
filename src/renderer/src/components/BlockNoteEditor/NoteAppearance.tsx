import { useEffect, useId, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useWindowColor,
  windowColorLabels,
  windowColorPreferences
} from '@renderer/store/windowColor';

const layouts = ['writing', 'reading', 'technical'] as const;
type Layout = (typeof layouts)[number];

const layoutAtom = atomWithStorage<Layout>('revezone.note.layout', 'writing', undefined, {
  unstable_getOnInit: true
});

export function useNoteAppearance() {
  const [savedLayout, setLayout] = useAtom(layoutAtom);
  const windowColor = useWindowColor();
  const layout = layouts.includes(savedLayout) ? savedLayout : 'writing';
  return { layout, setLayout, ...windowColor };
}

const english = {
  layout: 'Layout',
  writing: 'Clean writing',
  reading: 'Long-form reading',
  technical: 'Compact technical'
};
const simplified: typeof english = {
  layout: '排版',
  writing: '清爽写作',
  reading: '长文阅读',
  technical: '技术紧凑'
};
const traditional: typeof english = {
  layout: '排版',
  writing: '清爽寫作',
  reading: '長文閱讀',
  technical: '技術緊湊'
};

export function NoteAppearanceMenu({
  layout,
  preference,
  setLayout,
  setColor
}: ReturnType<typeof useNoteAppearance>) {
  const { i18n } = useTranslation();
  const locale = i18n.language.toLowerCase();
  const labels =
    locale === 'zh-tw' || locale === 'zh-hk'
      ? traditional
      : locale.startsWith('zh')
      ? simplified
      : english;
  const colorLabels = windowColorLabels(locale);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick, true);
  }, [open]);

  return (
    <div
      className="rz-note-appearance"
      ref={menu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return;
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button
        type="button"
        className="rz-note-appearance-trigger"
        data-testid="note-appearance-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        {colorLabels.appearance}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="rz-note-appearance-menu" id={id}>
          <fieldset className="rz-note-appearance-group">
            <legend>{labels.layout}</legend>
            {layouts.map((value) => (
              <label key={value} className="rz-note-appearance-option">
                <input
                  type="radio"
                  name={id + '-layout'}
                  checked={layout === value}
                  data-testid={'note-layout-' + value}
                  onChange={() => setLayout(value)}
                />
                <span>{labels[value]}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="rz-note-appearance-group">
            <legend>{colorLabels.color}</legend>
            {windowColorPreferences.map((value) => (
              <label key={value} className="rz-note-appearance-option">
                <input
                  type="radio"
                  name={id + '-color'}
                  checked={preference === value}
                  data-testid={'note-color-' + value}
                  onChange={() => setColor(value)}
                />
                <span>{colorLabels[value]}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
