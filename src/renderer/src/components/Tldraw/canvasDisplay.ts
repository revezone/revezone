import {
  DefaultColorStyle,
  DefaultColorThemePalette,
  type TLDefaultColorTheme,
  type TLUiMenuChild,
  type TLUiOverrides
} from '@tldraw/tldraw';

const themeAction = 'toggle-dark-mode';

function removeThemeAction<Item extends TLUiMenuChild>(items: Item[]): Item[] {
  return items
    .filter((item) => item.id !== themeAction)
    .map((item) =>
      'children' in item ? { ...item, children: removeThemeAction(item.children) } : item
    );
}

export const tldrawCanvasDisplayOverrides: TLUiOverrides = {
  actions: (_editor, actions) => ({
    ...actions,
    [themeAction]: { ...actions[themeAction], kbd: undefined }
  }),
  menu: (_editor, schema) => removeThemeAction(schema),
  keyboardShortcutsMenu: (_editor, schema) => removeThemeAction(schema)
};

const vectorShapes = ['arrow', 'draw', 'frame', 'geo', 'highlight', 'line'];
const vectorSelector = vectorShapes.map((type) => `[data-shape-type="${type}"]`).join(', ');

function htmlColorSelector(selector: string, property: string, color: string) {
  // React's inline hex colors are serialized to rgb() by the browser.
  const rgb = color
    .slice(1)
    .match(/../g)
    ?.map((channel) => parseInt(channel, 16))
    .join(', ');
  return `${selector}[style*="${property}: rgb(${rgb})"]`;
}

function paintRule(selector: string, property: 'fill' | 'stroke', from: string, to: string) {
  return from === to ? '' : `${selector} [${property}="${from}"] { ${property}: ${to}; }`;
}

function displayPalette(source: TLDefaultColorTheme, target: TLDefaultColorTheme) {
  const scope = `:root[data-revezone-canvas-display='follow-window'][data-revezone-color='${target.id}'] .tldraw-editor-container .tl-theme__${source.id}`;
  const canvas = `${scope} .tl-canvas`;
  const vector = `${canvas} .tl-shape:is(${vectorSelector})`;
  const label = `${canvas} :is(.tl-text-shape__wrapper, .tl-text-label__inner, .tl-arrow-label)`;
  const note = `${canvas} .tl-note__container`;
  const dark = target.id === 'dark';

  const rules = [
    `${scope} {
      --color-background: ${target.background};
      --color-text: ${target.text};
      --color-text-0: ${target.black.solid};
      --color-text-1: ${dark ? '#d9d9d9' : '#2d2d2d'};
      --color-grid: ${dark ? '#909090' : '#6d6d6d'};
      --color-culled: ${dark ? '#2f3439' : '#ebeef0'};
    }`,
    `${canvas} { color-scheme: ${target.id}; }`,
    paintRule(vector, 'fill', source.solid, target.solid),
    paintRule(vector, 'stroke', source.text, target.text)
  ];

  for (const color of DefaultColorStyle.values) {
    const from = source[color];
    const to = target[color];
    rules.push(
      paintRule(vector, 'fill', from.solid, to.solid),
      paintRule(vector, 'stroke', from.solid, to.solid),
      paintRule(vector, 'fill', from.semi, to.semi),
      paintRule(vector, 'fill', from.pattern, to.pattern),
      paintRule(vector, 'stroke', from.highlight.srgb, to.highlight.srgb),
      paintRule(vector, 'stroke', from.highlight.p3, to.highlight.p3),
      `${htmlColorSelector(label, 'color', from.solid)} { color: ${to.solid} !important; }`,
      `${htmlColorSelector(note, 'background-color', from.solid)} {
        background-color: ${to.solid} !important;
        color: ${to.solid} !important;
      }`
    );
  }

  if (source.id === 'light') {
    // The light red variants share a fill. Their outline identifies the intended palette color.
    const lightRed = source['light-red'];
    rules.push(
      paintRule(
        `${vector}:has([fill="${lightRed.solid}"], [stroke="${lightRed.solid}"])`,
        'fill',
        lightRed.semi,
        target['light-red'].semi
      )
    );
  }

  // The pinned editor emits both pattern palettes for eight integer zoom levels.
  for (let zoom = 1; zoom <= 8; zoom++) {
    rules.push(
      paintRule(
        vector,
        'fill',
        `url(#hash_pattern_zoom_${zoom}_${source.id})`,
        `url(#hash_pattern_zoom_${zoom}_${target.id})`
      )
    );
  }

  return rules.join('\n');
}

const { lightMode, darkMode } = DefaultColorThemePalette;

// Native SVG export reads the original user theme. These rules only reach the mounted canvas.
export const tldrawCanvasDisplayStyles = `@media screen {
  ${displayPalette(lightMode, darkMode)}
  ${displayPalette(darkMode, lightMode)}
}`;
