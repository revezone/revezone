import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { VERSION_KINDS, VERSION_SOURCES } from '../../shared/versionHistory';
import type {
  JsonValue,
  SaveVersionInput,
  VersionRecord,
  VersionSummary
} from '../../shared/versionHistory';

const DOCUMENT_ID = /^file_[a-zA-Z0-9_-]{1,96}$/;
const VERSION_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const MAX_LABEL_LENGTH = 120;
const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;
const MAX_INDEX_BYTES = 16 * 1024 * 1024;
const MAX_JSON_NODES = 2_000_000;

interface HistoryIndex {
  format: 1;
  versions: VersionSummary[];
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.some((allowed) => allowed === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertId(value: unknown, pattern: RegExp, message: string): asserts value is string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(message);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function serializeSnapshot(snapshot: unknown): string {
  const ancestors = new Set<object>();
  let nodes = 0;
  let stringLength = 0;

  function countString(value: string) {
    stringLength += value.length;
    if (stringLength > MAX_SNAPSHOT_BYTES) throw new Error('Version snapshot exceeds 64 MiB');
  }

  function validate(value: unknown, depth: number) {
    if (++nodes > MAX_JSON_NODES || depth > 100) throw new Error('Version snapshot is too complex');
    if (typeof value === 'string') {
      countString(value);
      return;
    }
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (!Array.isArray(value) && !isRecord(value)) throw new Error('Version snapshot must be JSON');
    if (ancestors.has(value)) throw new Error('Version snapshot contains a cycle');

    ancestors.add(value);
    if (Array.isArray(value)) {
      for (const item of value) validate(item, depth + 1);
    } else {
      for (const key of Object.keys(value)) {
        countString(key);
        validate(value[key], depth + 1);
      }
    }
    ancestors.delete(value);
  }

  validate(snapshot, 0);
  const payload = JSON.stringify(snapshot);
  if (Buffer.byteLength(payload) > MAX_SNAPSHOT_BYTES)
    throw new Error('Version snapshot exceeds 64 MiB');
  return payload;
}

async function requireDirectory(path: string) {
  if (!(await lstat(path)).isDirectory()) throw new Error('Invalid version history directory');
}

async function readJson(path: string, maxBytes: number): Promise<unknown> {
  if (!(await lstat(path)).isFile()) throw new Error('Invalid version history file');
  const file = await open(path, 'r');
  try {
    if ((await file.stat()).size > maxBytes)
      throw new Error('Version history file exceeds its size limit');
    return JSON.parse(await file.readFile('utf8')) as unknown;
  } finally {
    await file.close();
  }
}

async function writeAtomically(path: string, contents: string) {
  const temporary = join(dirname(path), `.write-${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(contents, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export class VersionHistoryStore {
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(private readonly root: string) {}

  async list(docId: unknown): Promise<VersionSummary[]> {
    assertId(docId, DOCUMENT_ID, 'Invalid version history document ID');
    return (await this.readIndex(docId)).versions;
  }

  async get(docId: unknown, versionId: unknown): Promise<VersionRecord | null> {
    assertId(docId, DOCUMENT_ID, 'Invalid version history document ID');
    assertId(versionId, VERSION_ID, 'Invalid version ID');
    const { versions } = await this.readIndex(docId);
    const version = versions.find(({ id }) => id === versionId);
    if (!version) return null;

    const snapshot = (await readJson(
      this.versionPath(docId, versionId),
      MAX_SNAPSHOT_BYTES
    )) as JsonValue;
    return { ...version, snapshot };
  }

  async save(input: unknown): Promise<VersionSummary> {
    if (!isRecord(input)) throw new Error('Invalid version history request');
    const { docId, kind, source, label, snapshot } = input;
    assertId(docId, DOCUMENT_ID, 'Invalid version history document ID');
    if (!isOneOf(VERSION_KINDS, kind)) throw new Error('Invalid version document kind');
    if (!isOneOf(VERSION_SOURCES, source)) throw new Error('Invalid version source');
    if (label !== undefined && (typeof label !== 'string' || label.length > MAX_LABEL_LENGTH)) {
      throw new Error('Invalid version label');
    }

    const previous = this.pending.get(docId);
    const operation = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => {
        return this.saveVersion({ docId, kind, source, label }, snapshot);
      });
    this.pending.set(docId, operation);

    try {
      return await operation;
    } finally {
      if (this.pending.get(docId) === operation) this.pending.delete(docId);
    }
  }

  private async saveVersion(info: Omit<SaveVersionInput, 'snapshot'>, snapshot: unknown) {
    const payload = serializeSnapshot(snapshot);
    const dir = this.documentPath(info.docId);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await requireDirectory(this.root);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await requireDirectory(dir);

    const index = await this.readIndex(info.docId);
    const parent = index.versions[0];
    if (parent && parent.kind !== info.kind) throw new Error('Version document kind changed');
    const version: VersionSummary = {
      ...info,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      parentId: parent?.id ?? null
    };
    const nextIndex = JSON.stringify({ format: 1, versions: [version, ...index.versions] });
    if (Buffer.byteLength(nextIndex) > MAX_INDEX_BYTES)
      throw new Error('Version history index is full');

    // Publishing the index makes the complete snapshot visible to both list and get.
    const path = this.versionPath(info.docId, version.id);
    await writeAtomically(path, payload);
    try {
      await writeAtomically(this.indexPath(info.docId), nextIndex);
    } catch (error) {
      await rm(path, { force: true }).catch(() => undefined);
      throw error;
    }
    return version;
  }

  private async readIndex(docId: string): Promise<HistoryIndex> {
    let raw: unknown;
    try {
      await requireDirectory(this.root);
      await requireDirectory(this.documentPath(docId));
      raw = await readJson(this.indexPath(docId), MAX_INDEX_BYTES);
    } catch (error) {
      if (isMissing(error)) return { format: 1, versions: [] };
      throw error;
    }

    if (
      !isRecord(raw) ||
      raw.format !== 1 ||
      !Array.isArray(raw.versions) ||
      raw.versions.some(
        (version) =>
          !isRecord(version) ||
          version.docId !== docId ||
          typeof version.id !== 'string' ||
          !VERSION_ID.test(version.id) ||
          (version.parentId !== null &&
            (typeof version.parentId !== 'string' || !VERSION_ID.test(version.parentId))) ||
          !isOneOf(VERSION_KINDS, version.kind) ||
          !isOneOf(VERSION_SOURCES, version.source) ||
          typeof version.createdAt !== 'string' ||
          (version.label !== undefined &&
            (typeof version.label !== 'string' || version.label.length > MAX_LABEL_LENGTH))
      )
    ) {
      throw new Error('Invalid version history index');
    }
    return { format: 1, versions: raw.versions as VersionSummary[] };
  }

  private documentPath(docId: string) {
    // The workspace's IDs are case-sensitive even on filesystems where names aren't.
    return join(this.root, createHash('sha256').update(docId).digest('hex'));
  }

  private indexPath(docId: string) {
    return join(this.documentPath(docId), 'index.json');
  }

  private versionPath(docId: string, versionId: string) {
    return join(this.documentPath(docId), `${versionId}.json`);
  }
}
