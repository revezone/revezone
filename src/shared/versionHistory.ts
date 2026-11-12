export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const VERSION_KINDS = ['note', 'board', 'tldraw'] as const;
export const VERSION_SOURCES = ['manual', 'ai', 'restore', 'before-ai', 'before-restore'] as const;

export type VersionKind = (typeof VERSION_KINDS)[number];
export type VersionSource = (typeof VERSION_SOURCES)[number];

export interface SaveVersionInput {
  docId: string;
  kind: VersionKind;
  source: VersionSource;
  label?: string;
  snapshot: JsonValue;
}

export interface VersionSummary extends Omit<SaveVersionInput, 'snapshot'> {
  id: string;
  createdAt: string;
  parentId: string | null;
}

export interface VersionRecord extends VersionSummary {
  snapshot: JsonValue;
}

export interface VersionHistoryBridge {
  list(docId: string): Promise<VersionSummary[]>;
  get(docId: string, versionId: string): Promise<VersionRecord | null>;
  save(input: SaveVersionInput): Promise<VersionSummary>;
}
