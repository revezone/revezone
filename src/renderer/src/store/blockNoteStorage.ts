import { defaultBlockSpecs, defaultStyleSpecs } from '@blocknote/core';
import type { PartialBlock } from '@blocknote/core';
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import * as Y from 'yjs';
import { MAX_INLINE_NOTE_ASSET_BYTES, NOTE_ASSET_URL } from '../../../shared/noteAssets';
import type { JsonValue } from '../../../shared/versionHistory';
import { blocksuiteStorage } from './blocksuite';
import {
  convertLegacyNote,
  isValidBlockNoteLink,
  LEGACY_NOTE_FORMAT,
  LegacyNoteConversionError,
  resolveLegacyAssets
} from './blockNoteLegacy';
import type { BlockNoteDocument, LegacyNoteConversion } from './blockNoteLegacy';

export type { BlockNoteDocument } from './blockNoteLegacy';
export { isValidBlockNoteLink } from './blockNoteLegacy';

const DATABASE = 'revezone_blocknote';
const NOTES = 'notes';
const NOTE_FORMAT = 'revezone-note-blocknote-v1';
const BLOCK_TYPES = defaultBlockSpecs as Record<
  string,
  {
    config: {
      content: string;
      propSchema: Record<string, { default: unknown; type?: string; values?: readonly unknown[] }>;
    };
  }
>;
const STYLE_TYPES = defaultStyleSpecs as Record<string, { config: { propSchema: string } }>;

interface BlockNoteDatabase extends DBSchema {
  notes: {
    key: string;
    value: BlockNoteDocument;
  };
}

export class LegacyNoteMigrationError extends Error {
  constructor(cause: unknown) {
    super(
      cause instanceof LegacyNoteConversionError
        ? cause.message
        : 'The original note could not be read or saved safely.',
      { cause }
    );
    this.name = 'LegacyNoteMigrationError';
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function invalidDocument(): never {
  throw new Error('The BlockNote document is invalid or contains unsupported content.');
}

function localAsset(url: string) {
  return url.startsWith(NOTE_ASSET_URL) && /^[a-f0-9]{64}$/.test(url.slice(NOTE_ASSET_URL.length));
}

function checkInline(value: unknown, linkContent = false) {
  if (typeof value === 'string') return;
  if (!Array.isArray(value)) invalidDocument();
  for (const inline of value) {
    if (typeof inline === 'string' && !linkContent) continue;
    if (!object(inline)) invalidDocument();
    if (inline.type === 'link' && !linkContent) {
      if (!isValidBlockNoteLink(inline.href)) invalidDocument();
      checkInline(inline.content, true);
      continue;
    }
    if (inline.type !== 'text' || typeof inline.text !== 'string' || !object(inline.styles)) {
      invalidDocument();
    }
    for (const [key, style] of Object.entries(inline.styles)) {
      const config = Object.hasOwn(STYLE_TYPES, key) && STYLE_TYPES[key].config;
      if (!config || typeof style !== config.propSchema) invalidDocument();
    }
  }
}

function checkTable(value: unknown) {
  if (!object(value) || value.type !== 'tableContent' || !Array.isArray(value.rows)) {
    invalidDocument();
  }
  for (const row of value.rows) {
    if (!object(row) || !Array.isArray(row.cells)) invalidDocument();
    for (const cell of row.cells) {
      checkInline(object(cell) && cell.type === 'tableCell' ? cell.content : cell);
    }
  }
}

function readDocument(value: unknown): BlockNoteDocument {
  if (!object(value) || typeof value.title !== 'string' || !Array.isArray(value.blocks)) {
    invalidDocument();
  }
  const ids = new Set<string>();
  function checkBlock(block: unknown, depth: number) {
    if (
      depth > 128 ||
      !object(block) ||
      typeof block.id !== 'string' ||
      !block.id ||
      ids.has(block.id) ||
      typeof block.type !== 'string' ||
      !Object.hasOwn(BLOCK_TYPES, block.type)
    ) {
      invalidDocument();
    }
    ids.add(block.id);
    const spec = BLOCK_TYPES[block.type].config;
    if (block.props !== undefined) {
      if (!object(block.props)) invalidDocument();
      for (const [key, prop] of Object.entries(block.props)) {
        const config = Object.hasOwn(spec.propSchema, key) && spec.propSchema[key];
        if (!config) invalidDocument();
        if (
          prop !== undefined &&
          (typeof prop !== (config.type ?? typeof config.default) ||
            (typeof prop === 'number' && !Number.isFinite(prop)) ||
            (config.values && !config.values.includes(prop)))
        ) {
          invalidDocument();
        }
      }
      const url = block.props.url;
      if (typeof url === 'string' && url && !localAsset(url) && !/^https?:\/\//i.test(url)) {
        invalidDocument();
      }
    }
    if (block.content !== undefined) {
      if (spec.content === 'table') checkTable(block.content);
      else if (spec.content === 'inline' || spec.content === 'plain') checkInline(block.content);
      else invalidDocument();
    }
    if (block.children !== undefined) {
      if (!Array.isArray(block.children)) invalidDocument();
      for (const child of block.children) checkBlock(child, depth + 1);
    }
  }
  for (const block of value.blocks) checkBlock(block, 0);
  return { title: value.title, blocks: value.blocks as PartialBlock[] };
}

function cloneDocument(document: BlockNoteDocument) {
  // BlockNote uses undefined for optional native properties, which are omitted in history JSON.
  return readDocument(JSON.parse(JSON.stringify(document)));
}

function assetUrls(blocks: PartialBlock[]) {
  const urls = new Set<string>();
  function visit(block: PartialBlock) {
    if (block.props && 'url' in block.props && typeof block.props.url === 'string') {
      if (localAsset(block.props.url)) urls.add(block.props.url);
    }
    block.children?.forEach(visit);
  }
  blocks.forEach(visit);
  return urls;
}

async function verifyAssets(document: BlockNoteDocument) {
  await Promise.all(
    [...assetUrls(document.blocks)].map(async (url) => {
      if (!(await window.noteAssets?.has(url))) {
        throw new Error('A local attachment in the note is unavailable.');
      }
    })
  );
}

function sniffImage(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 24));
  const text = String.fromCharCode(...view);
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => view[index] === byte))
    return 'image/png';
  if (view[0] === 255 && view[1] === 216 && view[2] === 255) return 'image/jpeg';
  if (/^GIF8[79]a/.test(text)) return 'image/gif';
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
  if (text.startsWith('BM')) return 'image/bmp';
  if (text.slice(4, 8) === 'ftyp' && /avif|avis/.test(text.slice(8))) return 'image/avif';
  if (view[0] === 0 && view[1] === 0 && view[2] === 1 && view[3] === 0)
    return 'image/vnd.microsoft.icon';
  throw new LegacyNoteConversionError(
    'An image in the legacy note has an unsupported or unreadable format.'
  );
}

async function importLegacyAssets(
  conversion: LegacyNoteConversion,
  getBlob: (id: string) => Promise<Blob | null | undefined>
) {
  const urls = new Map<string, string>();
  for (const [id, sizes] of conversion.assets) {
    const bridge = window.noteAssets;
    if (!bridge) throw new LegacyNoteConversionError('Local attachment storage is unavailable.');
    const blob = await getBlob(id);
    if (!blob || !blob.size || blob.size > MAX_INLINE_NOTE_ASSET_BYTES) {
      throw new LegacyNoteConversionError(
        'An image in the legacy note is missing or too large to migrate.'
      );
    }
    const bytes = await blob.arrayBuffer();
    const mime = sniffImage(bytes);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: mime })).catch(() => {
      throw new LegacyNoteConversionError('An image in the legacy note could not be decoded.');
    });
    try {
      if (
        !bitmap.width ||
        !bitmap.height ||
        sizes.some(
          ({ width, height }) =>
            width && Math.abs((width * bitmap.height) / bitmap.width - height) > 2
        )
      ) {
        throw new LegacyNoteConversionError(
          'The legacy image has dimensions that cannot be preserved.'
        );
      }
    } finally {
      bitmap.close();
    }
    const url = await bridge.saveBytes(bytes, mime);
    if (!localAsset(url) || !(await bridge.has(url))) {
      throw new LegacyNoteConversionError('An image in the legacy note could not be saved.');
    }
    urls.set(id, url);
  }
  return readDocument(resolveLegacyAssets(conversion, urls));
}

function legacyTitle(id: string) {
  return blocksuiteStorage.getPageTitle(id);
}

function fromBase64(data: string) {
  const decoded = atob(data);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function convertLegacyVersion(snapshot: Record<string, unknown>) {
  if (typeof snapshot.update !== 'string' || !Array.isArray(snapshot.blobs)) {
    throw new Error('The legacy note version is invalid.');
  }
  // References remain usable by ID even when the original workspace is unavailable.
  await blocksuiteStorage.ready().catch(() => undefined);
  const doc = new Y.Doc();
  let conversion: LegacyNoteConversion;
  try {
    Y.applyUpdate(doc, fromBase64(snapshot.update));
    conversion = convertLegacyNote(doc.getMap('blocks'), legacyTitle);
  } finally {
    doc.destroy();
  }
  const records = new Map<string, { mime: string; data: string }>();
  for (const asset of snapshot.blobs) {
    if (
      !object(asset) ||
      typeof asset.id !== 'string' ||
      typeof asset.mime !== 'string' ||
      typeof asset.data !== 'string' ||
      records.has(asset.id) ||
      !conversion.assets.has(asset.id)
    ) {
      throw new Error('The legacy note version has an invalid attachment.');
    }
    records.set(asset.id, { mime: asset.mime, data: asset.data });
  }
  if (records.size !== conversion.assets.size) {
    throw new Error('The legacy note version is missing an attachment.');
  }
  return importLegacyAssets(conversion, async (id) => {
    const record = records.get(id);
    return record && new Blob([fromBase64(record.data)], { type: record.mime });
  });
}

function inlineText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(inlineText).join('');
  if (!object(content)) return '';
  if (typeof content.text === 'string') return content.text;
  if (content.type === 'tableContent' && Array.isArray(content.rows)) {
    return content.rows
      .map((row) =>
        object(row) && Array.isArray(row.cells) ? row.cells.map(inlineText).join(' | ') : ''
      )
      .join('\n');
  }
  return inlineText(content.content);
}

function blank(document: BlockNoteDocument) {
  const [block] = document.blocks;
  const props = block?.props ?? {};
  return (
    document.title === '' &&
    document.blocks.length === 1 &&
    block?.type === 'paragraph' &&
    !block.children?.length &&
    !inlineText(block.content) &&
    Object.entries(props).every(
      ([key, value]) => value === BLOCK_TYPES.paragraph.config.propSchema[key]?.default
    )
  );
}

function copyDocument(document: BlockNoteDocument, fromId: string, toId: string) {
  function rewriteLinks(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(rewriteLinks);
    if (!object(value)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === 'href' && child === 'revezone://' + fromId
          ? 'revezone://' + toId
          : rewriteLinks(child)
      ])
    );
  }
  function copyBlock(block: PartialBlock): PartialBlock {
    return {
      ...block,
      id: crypto.randomUUID(),
      content: rewriteLinks(block.content),
      children: block.children?.map(copyBlock)
    } as PartialBlock;
  }
  return { title: document.title, blocks: document.blocks.map(copyBlock) };
}

class BlockNoteStorage {
  private database?: Promise<IDBPDatabase<BlockNoteDatabase>>;
  private pending = new Map<string, Promise<unknown>>();

  private db() {
    if (!this.database) {
      this.database = openDB<BlockNoteDatabase>(DATABASE, 1, {
        upgrade(database) {
          database.createObjectStore(NOTES);
        }
      }).catch((error) => {
        this.database = undefined;
        throw error;
      });
    }
    return this.database;
  }

  private enqueue<T>(docId: string, run: () => Promise<T>) {
    const job = (this.pending.get(docId) ?? Promise.resolve()).catch(() => undefined).then(run);
    this.pending.set(docId, job);
    const clear = () => {
      if (this.pending.get(docId) === job) this.pending.delete(docId);
    };
    job.then(clear, clear);
    return job;
  }

  create(docId: string): Promise<void> {
    return this.enqueue(docId, async () => {
      const db = await this.db();
      await db.add(
        NOTES,
        {
          title: '',
          blocks: [{ id: crypto.randomUUID(), type: 'paragraph', content: [] }]
        },
        docId
      );
    });
  }

  async listIds(): Promise<string[]> {
    return (await this.db()).getAllKeys(NOTES);
  }

  async legacySnapshot(docId: string): Promise<JsonValue> {
    return blocksuiteStorage.capturePage(docId);
  }

  load(docId: string): Promise<BlockNoteDocument> {
    return this.enqueue(docId, async () => {
      const db = await this.db();
      const stored = await db.get(NOTES, docId);
      if (stored !== undefined) return readDocument(stored);
      let document: BlockNoteDocument;
      try {
        await blocksuiteStorage.ready();
        const blocks = blocksuiteStorage.getPageBlocks(docId);
        if (!blocks?.size) {
          throw new LegacyNoteConversionError('The original note could not be found.');
        }
        document = await importLegacyAssets(convertLegacyNote(blocks, legacyTitle), (id) =>
          blocksuiteStorage.getBlob(id)
        );
      } catch (error) {
        throw new LegacyNoteMigrationError(error);
      }
      const tx = db.transaction(NOTES, 'readwrite');
      const latest = await tx.store.get(docId);
      if (latest === undefined) await tx.store.add(document, docId);
      await tx.done;
      return latest === undefined ? document : readDocument(latest);
    });
  }

  async save(docId: string, document: BlockNoteDocument): Promise<void> {
    const copy = cloneDocument(document);
    return this.enqueue(docId, async () => {
      await verifyAssets(copy);
      const db = await this.db();
      const tx = db.transaction(NOTES, 'readwrite');
      if (!(await tx.store.getKey(docId))) {
        await tx.done;
        throw new Error('This note is no longer in the workspace.');
      }
      await tx.store.put(copy, docId);
      await tx.done;
    });
  }

  async capture(docId: string, document: BlockNoteDocument): Promise<JsonValue> {
    const copy = cloneDocument(document);
    await verifyAssets(copy);
    return { format: NOTE_FORMAT, pageId: docId, ...copy } as unknown as JsonValue;
  }

  async prepareRestore(
    docId: string,
    snapshot: JsonValue,
    allowCopy = false
  ): Promise<BlockNoteDocument> {
    if (
      !object(snapshot) ||
      typeof snapshot.pageId !== 'string' ||
      (snapshot.format !== NOTE_FORMAT && snapshot.format !== LEGACY_NOTE_FORMAT)
    ) {
      throw new Error('This note version is invalid.');
    }
    const copying = snapshot.pageId !== docId;
    if (copying && (!allowCopy || !blank(await this.load(docId)))) {
      throw new Error('A version copy needs a new, empty note.');
    }
    const document =
      snapshot.format === LEGACY_NOTE_FORMAT
        ? await convertLegacyVersion(snapshot)
        : readDocument(snapshot);
    await verifyAssets(document);
    return copying ? copyDocument(document, snapshot.pageId, docId) : document;
  }

  preview(snapshot: JsonValue): string[] {
    if (!object(snapshot)) return [];
    if (snapshot.format === LEGACY_NOTE_FORMAT) return blocksuiteStorage.previewPage(snapshot);
    if (snapshot.format !== NOTE_FORMAT) return [];
    try {
      const document = readDocument(snapshot);
      const lines = document.title ? [document.title.slice(0, 600)] : [];
      const visit = (block: PartialBlock) => {
        if (lines.length >= 40) return;
        const text = inlineText(block.content);
        if (text) lines.push(text.slice(0, 600));
        if (block.props && 'url' in block.props && block.props.url && lines.length < 40) {
          lines.push('[Attachment]');
        }
        block.children?.forEach(visit);
      };
      document.blocks.forEach(visit);
      return lines;
    } catch {
      return [];
    }
  }
}

export const blockNoteStorage = new BlockNoteStorage();
