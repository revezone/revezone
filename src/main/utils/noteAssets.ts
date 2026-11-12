import { app, ipcMain, protocol, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { createHash } from 'node:crypto';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  MAX_INLINE_NOTE_ASSET_BYTES,
  NOTE_ASSET_CHANNELS,
  NOTE_ASSET_SCHEME,
  NOTE_ASSET_URL
} from '../../shared/noteAssets';

const DEFAULT_MIME = 'application/octet-stream';
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,79}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,79}$/;

function assetId(url: unknown) {
  if (typeof url !== 'string' || !url.startsWith(NOTE_ASSET_URL)) return undefined;
  const id = url.slice(NOTE_ASSET_URL.length);
  return /^[a-f0-9]{64}$/.test(id) ? id : undefined;
}

function normalizeMime(value: unknown) {
  const mime = typeof value === 'string' && value.length <= 160 ? value.trim().toLowerCase() : '';
  return MIME.test(mime) ? mime : DEFAULT_MIME;
}

function assetRoot() {
  return join(app.getPath('userData'), 'note-assets');
}

async function getAsset(id: string) {
  try {
    const path = join(assetRoot(), id, 'data');
    const info = await lstat(path);
    if (!info.isFile()) return undefined;
    const mime = await readFile(join(assetRoot(), id, 'mime'), 'utf8');
    if (!MIME.test(mime)) return undefined;
    return { path, size: info.size, mime };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function persistAsset(stream: Readable, mime: string, checkSource?: () => Promise<void>) {
  const root = assetRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stage = await mkdtemp(join(root, '.incoming-'));
  const data = join(stage, 'data');
  const hash = createHash('sha256').update(mime).update('\0');
  try {
    await pipeline(
      stream,
      new Transform({
        transform(chunk: Buffer, _encoding, done) {
          hash.update(chunk);
          done(null, chunk);
        }
      }),
      createWriteStream(data, { flags: 'wx', mode: 0o600 })
    );
    await checkSource?.();
    const file = await open(data, 'r+');
    try {
      await file.sync();
    } finally {
      await file.close();
    }
    const metadata = await open(join(stage, 'mime'), 'wx', 0o600);
    try {
      await metadata.writeFile(mime);
      await metadata.sync();
    } finally {
      await metadata.close();
    }
    const id = hash.digest('hex');
    try {
      await rename(stage, join(root, id));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOTEMPTY' && code !== 'EEXIST' && code !== 'EPERM') throw error;
      const existing = await getAsset(id);
      if (!existing || existing.mime !== mime || existing.size !== (await lstat(data)).size) {
        throw error;
      }
    }
    return NOTE_ASSET_URL + id;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function importPath(path: unknown, mime: unknown) {
  if (typeof path !== 'string' || path.length > 8192 || !isAbsolute(path)) {
    throw new Error('Choose a local file to attach.');
  }
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile()) throw new Error('Choose a regular file to attach.');
    return await persistAsset(
      file.createReadStream({ autoClose: false }),
      normalizeMime(mime),
      async () => {
        const after = await file.stat();
        if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
          throw new Error('The source file changed while attaching it. Try again.');
        }
      }
    );
  } finally {
    await file.close();
  }
}

function parseRange(value: string, size: number) {
  const parts = /^bytes=(\d*)-(\d*)$/i.exec(value);
  if (!parts || (!parts[1] && !parts[2]) || size === 0) return undefined;
  const end = parts[2] ? Number(parts[2]) : size - 1;
  if (!Number.isSafeInteger(end)) return undefined;
  if (!parts[1]) {
    if (end < 1) return undefined;
    return { start: Math.max(0, size - end), end: size - 1 };
  }
  const start = Number(parts[1]);
  if (!Number.isSafeInteger(start) || start >= size || end < start) return undefined;
  return { start, end: Math.min(end, size - 1) };
}

async function serveAsset(request: Request) {
  const id = assetId(request.url);
  if (!id) return new Response(null, { status: 404 });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const asset = await getAsset(id);
  if (!asset) return new Response(null, { status: 404 });
  const rangeHeader = request.headers.get('range');
  const range = rangeHeader ? parseRange(rangeHeader, asset.size) : undefined;
  if (rangeHeader && !range) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${asset.size}`, 'Accept-Ranges': 'bytes' }
    });
  }
  const headers: Record<string, string> = {
    'Content-Type': asset.mime,
    'Content-Length': String(range ? range.end - range.start + 1 : asset.size),
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff'
  };
  if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${asset.size}`;
  const body =
    request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(asset.path, range));
  return new Response(body as BodyInit | null, { status: range ? 206 : 200, headers });
}

export function registerNoteAssetScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: NOTE_ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ]);
}

export function registerNoteAssets(assertRendererSender: (event: IpcMainInvokeEvent) => void) {
  protocol.handle(NOTE_ASSET_SCHEME, async (request) => {
    try {
      return await serveAsset(request);
    } catch {
      return new Response(null, { status: 500 });
    }
  });
  ipcMain.handle(NOTE_ASSET_CHANNELS.savePath, (event, path: unknown, mime: unknown) => {
    assertRendererSender(event);
    return importPath(path, mime);
  });
  ipcMain.handle(NOTE_ASSET_CHANNELS.saveBytes, (event, bytes: unknown, mime: unknown) => {
    assertRendererSender(event);
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > MAX_INLINE_NOTE_ASSET_BYTES) {
      throw new Error('The attachment could not be imported as an inline file.');
    }
    return persistAsset(Readable.from([Buffer.from(bytes)]), normalizeMime(mime));
  });
  ipcMain.handle(NOTE_ASSET_CHANNELS.has, async (event, url: unknown) => {
    assertRendererSender(event);
    const id = assetId(url);
    return id ? Boolean(await getAsset(id)) : false;
  });
  ipcMain.handle(NOTE_ASSET_CHANNELS.open, async (event, url: unknown, filename: unknown) => {
    assertRendererSender(event);
    const id = assetId(url);
    const asset = id && (await getAsset(id));
    if (!asset || typeof filename !== 'string') throw new Error('This attachment is unavailable.');
    const cleaned = basename(filename.replace(/\\/g, '/'))
      .replace(/[<>:"/\\|?*\p{Cc}]/gu, '_')
      .slice(0, 180)
      .trim()
      .replace(/[. ]+$/, '');
    const dir = await mkdtemp(join(tmpdir(), 'revezone-attachment-'));
    const path = join(dir, cleaned || 'attachment');
    try {
      await copyFile(asset.path, path);
      const error = await shell.openPath(path);
      if (error) throw new Error('There is no application available to open this attachment.');
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
  });
}
