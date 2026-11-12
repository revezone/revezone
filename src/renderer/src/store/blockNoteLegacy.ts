import type { DefaultStyleSchema, PartialBlock, PartialLink, StyledText } from '@blocknote/core';
import * as Y from 'yjs';

export const LEGACY_NOTE_FORMAT = 'revezone-note-yjs-v1';
const LEGACY_ASSET_PREFIX = 'revezone-legacy-asset:';
const FRAME_BACKGROUND = '--affine-background-secondary-color';

type LegacyBlock = Y.Map<unknown>;
type ImageSize = { width: number; height: number };
type Inline = StyledText<DefaultStyleSchema> | PartialLink<DefaultStyleSchema>;

export type BlockNoteDocument = { title: string; blocks: PartialBlock[] };
export type LegacyNoteConversion = BlockNoteDocument & { assets: Map<string, ImageSize[]> };

export class LegacyNoteConversionError extends Error {}

function invalid(message: string): never {
  throw new LegacyNoteConversionError(message);
}

export function isValidBlockNoteLink(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.trim() !== value) return false;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127 || character === '\\') return false;
  }
  return (
    /^(?:https?:|mailto:|tel:|revezone:\/\/)/i.test(value) || !/^[a-z][a-z\d+.-]*:/i.test(value)
  );
}

function checkedLink(value: unknown) {
  if (!isValidBlockNoteLink(value)) return invalid('A legacy link uses an unsupported address.');
  return value;
}

function readInline(value: unknown, titleFor: (id: string) => string | undefined) {
  if (!(value instanceof Y.Text) || Object.keys(value.getAttributes()).length) {
    return invalid('The legacy note contains unreadable text.');
  }
  const content: Inline[] = [];
  for (const { insert, attributes } of value.toDelta()) {
    if (typeof insert !== 'string' || !insert) {
      return invalid('The legacy note contains an unsupported inline object.');
    }
    const styles: StyledText<DefaultStyleSchema>['styles'] = {};
    let href: string | undefined;
    let label = insert;
    for (const [name, attribute] of Object.entries(attributes ?? {})) {
      if (name === 'link') {
        if (href) return invalid('A legacy inline link has conflicting targets.');
        href = checkedLink(attribute);
      } else if (name === 'reference') {
        const reference = attribute as { pageId?: unknown; type?: unknown } | undefined;
        if (
          href ||
          !reference ||
          !['LinkedPage', 'Subpage'].includes(String(reference.type)) ||
          typeof reference.pageId !== 'string' ||
          !reference.pageId ||
          Object.keys(reference).some((key) => !['type', 'pageId'].includes(key))
        ) {
          return invalid('A legacy note reference is invalid.');
        }
        href = checkedLink('revezone://' + reference.pageId);
        if (insert === ' ') label = titleFor(reference.pageId) || reference.pageId;
      } else if (
        (name === 'bold' ||
          name === 'italic' ||
          name === 'underline' ||
          name === 'strike' ||
          name === 'code') &&
        typeof attribute === 'boolean'
      ) {
        if (attribute) styles[name] = true;
      } else {
        return invalid('The legacy note contains unsupported text formatting.');
      }
    }
    const text: StyledText<DefaultStyleSchema> = { type: 'text', text: label, styles };
    content.push(href ? { type: 'link', href, content: [text] } : text);
  }
  return content;
}

function plainText(value: unknown, titleFor: (id: string) => string | undefined) {
  const content = readInline(value, titleFor);
  if (content.some((part) => part.type !== 'text' || Object.keys(part.styles).length)) {
    return invalid('The legacy note contains formatting that cannot be preserved in this field.');
  }
  return content.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

function props(block: LegacyBlock, allowed: string[]) {
  if (
    [...block.keys()].some(
      (key) => !['sys:id', 'sys:flavour', 'sys:children'].includes(key) && !allowed.includes(key)
    )
  ) {
    return invalid('The legacy note contains block properties that cannot be preserved.');
  }
}

function frameDefaults(block: LegacyBlock) {
  props(block, ['prop:xywh', 'prop:background', 'prop:index']);
  const bounds = block.get('prop:xywh');
  const background = block.get('prop:background');
  const index = block.get('prop:index');
  let values: unknown;
  try {
    values = typeof bounds === 'string' ? JSON.parse(bounds) : undefined;
  } catch {
    return false;
  }
  return (
    (bounds === undefined ||
      (Array.isArray(values) &&
        values.length === 4 &&
        values[0] === 0 &&
        values[1] === 0 &&
        values[2] === 800 &&
        Number.isFinite(values[3]) &&
        values[3] > 0)) &&
    (background === undefined || background === FRAME_BACKGROUND) &&
    (index === undefined || index === 'a0')
  );
}

export function convertLegacyNote(
  source: Y.Map<unknown>,
  titleFor: (id: string) => string | undefined
): LegacyNoteConversion {
  const assets = new Map<string, ImageSize[]>();
  const roots = [...source.entries()].filter(
    ([, value]) => value instanceof Y.Map && value.get('sys:flavour') === 'affine:page'
  );
  if (roots.length !== 1) return invalid('The legacy note does not have exactly one page root.');
  const [[rootId, rootBlock]] = roots;
  const root = rootBlock as LegacyBlock;
  props(root, ['prop:title']);
  const title = plainText(root.get('prop:title'), titleFor);
  const visited = new Set<string>();

  function readBlock(id: string, depth: number): [LegacyBlock, string[]] {
    const block = source.get(id);
    if (depth > 128 || visited.has(id) || !(block instanceof Y.Map) || block.get('sys:id') !== id) {
      return invalid('The legacy note contains a missing, repeated or invalid block.');
    }
    const children = block.get('sys:children');
    if (!(children instanceof Y.Array)) return invalid('A legacy block has unreadable children.');
    const ids = children.toArray();
    if (ids.some((child) => typeof child !== 'string' || !child)) {
      return invalid('A legacy block has an invalid child reference.');
    }
    visited.add(id);
    return [block, ids];
  }

  function contentBlock(id: string, depth: number): PartialBlock {
    const [block, childIds] = readBlock(id, depth);
    const children = childIds.map((child) => contentBlock(child, depth + 1));
    const flavour = block.get('sys:flavour');
    const blockType = block.get('prop:type');
    if (flavour === 'affine:paragraph') {
      props(block, ['prop:type', 'prop:text']);
      const content = readInline(block.get('prop:text'), titleFor);
      if (blockType === 'text') return { id, type: 'paragraph', content, children };
      if (blockType === 'quote') return { id, type: 'quote', content, children };
      if (typeof blockType === 'string' && /^h[1-6]$/.test(blockType)) {
        return {
          id,
          type: 'heading',
          props: { level: Number(blockType[1]) as 1 | 2 | 3 | 4 | 5 | 6 },
          content,
          children
        };
      }
      return invalid('The legacy note contains an unsupported paragraph style.');
    }
    if (flavour === 'affine:list') {
      props(block, ['prop:type', 'prop:text', 'prop:checked']);
      const content = readInline(block.get('prop:text'), titleFor);
      const checked = block.get('prop:checked');
      if (typeof checked !== 'boolean' || (checked && blockType !== 'todo')) {
        return invalid('The legacy note contains an unreadable checklist.');
      }
      if (blockType === 'todo')
        return { id, type: 'checkListItem', props: { checked }, content, children };
      if (blockType === 'bulleted') return { id, type: 'bulletListItem', content, children };
      if (blockType === 'numbered') return { id, type: 'numberedListItem', content, children };
      if (blockType === 'toggle') return { id, type: 'toggleListItem', content, children };
      return invalid('The legacy note contains an unsupported list style.');
    }
    if (flavour === 'affine:code') {
      props(block, ['prop:text', 'prop:language']);
      const language = block.get('prop:language');
      if (typeof language !== 'string' || !language || children.length) {
        return invalid('The legacy note contains an unreadable code block.');
      }
      return {
        id,
        type: 'codeBlock',
        props: { language: language === 'Plain Text' ? 'text' : language },
        content: plainText(block.get('prop:text'), titleFor)
      };
    }
    if (flavour === 'affine:divider') {
      props(block, []);
      if (children.length) return invalid('A legacy divider has unexpected content.');
      return { id, type: 'divider' };
    }
    if (flavour === 'affine:bookmark') {
      props(block, [
        'prop:url',
        'prop:title',
        'prop:description',
        'prop:caption',
        'prop:icon',
        'prop:image',
        'prop:crawled'
      ]);
      const url = checkedLink(block.get('prop:url'));
      const label = block.get('prop:title') ?? '';
      const description = block.get('prop:description') ?? '';
      const caption = block.get('prop:caption') ?? '';
      const crawled = block.get('prop:crawled');
      const icon = block.get('prop:icon');
      const image = block.get('prop:image');
      if (
        children.length ||
        typeof label !== 'string' ||
        typeof description !== 'string' ||
        typeof caption !== 'string' ||
        (crawled !== undefined && typeof crawled !== 'boolean') ||
        (icon !== undefined && icon !== '') ||
        (image !== undefined && image !== '')
      ) {
        return invalid(
          'The legacy note contains a bookmark with preview content that cannot be migrated.'
        );
      }
      return {
        id,
        type: 'paragraph',
        content: [
          { type: 'link', href: url, content: label || url },
          ...[description, caption].filter(Boolean).map((text) => '\n' + text)
        ]
      };
    }
    if (flavour === 'affine:embed' && blockType === 'image') {
      props(block, ['prop:type', 'prop:caption', 'prop:sourceId', 'prop:width', 'prop:height']);
      const caption = block.get('prop:caption');
      const sourceId = block.get('prop:sourceId');
      const width = block.get('prop:width');
      const height = block.get('prop:height');
      if (
        children.length ||
        typeof caption !== 'string' ||
        typeof sourceId !== 'string' ||
        !sourceId ||
        typeof width !== 'number' ||
        !Number.isFinite(width) ||
        width < 0 ||
        typeof height !== 'number' ||
        !Number.isFinite(height) ||
        height < 0 ||
        Boolean(width) !== Boolean(height)
      ) {
        return invalid('The legacy note contains an unreadable image block.');
      }
      const sizes = assets.get(sourceId) ?? [];
      sizes.push({ width, height });
      assets.set(sourceId, sizes);
      return {
        id,
        type: 'image',
        props: {
          url: LEGACY_ASSET_PREFIX + sourceId,
          caption,
          ...(width ? { previewWidth: width } : {})
        }
      };
    }
    return invalid('The legacy note contains an unsupported block type.');
  }

  const [, rootChildren] = readBlock(rootId, 0);
  const blocks: PartialBlock[] = [];
  let frame = false;
  let surface = false;
  for (const id of rootChildren) {
    const [block, children] = readBlock(id, 1);
    const flavour = block.get('sys:flavour');
    if (flavour === 'affine:frame' && !frame && frameDefaults(block)) {
      frame = true;
      blocks.push(...children.map((child) => contentBlock(child, 2)));
    } else if (flavour === 'affine:surface' && !surface && !children.length) {
      surface = true;
      props(block, ['elements']);
      const elements = block.get('elements');
      if (elements !== undefined && (!(elements instanceof Y.Map) || elements.size)) {
        return invalid('The legacy note has canvas content that cannot be migrated.');
      }
    } else {
      return invalid('The legacy note has a layout that cannot be migrated.');
    }
  }
  if (visited.size !== source.size) return invalid('The legacy note contains unreachable blocks.');
  if (!blocks.length) blocks.push({ id: rootId + '-empty', type: 'paragraph', content: [] });
  return { title, blocks, assets };
}

export function resolveLegacyAssets(
  conversion: LegacyNoteConversion,
  urls: ReadonlyMap<string, string>
): BlockNoteDocument {
  function resolve(block: PartialBlock): PartialBlock {
    if (block.type === 'image') {
      const sourceId = block.props?.url?.slice(LEGACY_ASSET_PREFIX.length) ?? '';
      const url = urls.get(sourceId);
      if (!url) return invalid('A legacy image could not be migrated.');
      return { ...block, props: { ...block.props, url } };
    }
    return block.children ? { ...block, children: block.children.map(resolve) } : block;
  }
  return { title: conversion.title, blocks: conversion.blocks.map(resolve) };
}
