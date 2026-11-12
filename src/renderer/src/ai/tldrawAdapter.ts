import {
  Box2d,
  CameraRecordType,
  createShapeId,
  InstancePageStateRecordType,
  TLDOCUMENT_ID
} from '@tldraw/tldraw';
import type {
  Editor,
  RecordsDiff,
  StoreSnapshot,
  TLArrowShape,
  TLGeoShape,
  TLPage,
  TLPageId,
  TLRecord,
  TLShape,
  TLShapeId,
  TLShapePartial,
  TLTextShape
} from '@tldraw/tldraw';
import type { JsonValue } from '../../../shared/versionHistory';
import { AiEditValidationError } from './editorRegistry';
import type { AiContext, AiEditorAdapter, AiOperation } from './editorRegistry';

const SNAPSHOT_FORMAT = 'revezone-tldraw-v1';
const MAX_CONTEXT_ITEMS = 100;
// The pinned Tldraw editor enforces this limit before executing createShapes.
const MAX_SHAPES_PER_PAGE = 2000;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 104;
const DOCUMENT_TYPES = new Set(['document', 'page', 'shape', 'asset']);
const isNodeShape = (value: unknown): value is 'rectangle' | 'ellipse' | 'diamond' =>
  value === 'rectangle' || value === 'ellipse' || value === 'diamond';

type ContextItem = AiContext['items'][number];
type NativeSnapshot = StoreSnapshot<TLRecord>;
type Point = { x: number; y: number };
type LabelShape = TLGeoShape | TLTextShape;
type Target = Point & { id: TLShapeId };

function isLabelShape(shape: TLShape): shape is LabelShape {
  return (shape.type === 'text' || shape.type === 'geo') && shapeText(shape) !== undefined;
}

function shapeText(shape: TLShape) {
  return shape.props && 'text' in shape.props && typeof shape.props.text === 'string'
    ? shape.props.text
    : undefined;
}

function canonicalJson(value: unknown) {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]])
        )
      : entry
  );
}

function itemVersion(editor: Editor, shape: TLShape) {
  const bounds = editor.getShapePageBounds(shape);
  const transform = editor.getShapePageTransform(shape);
  const data = canonicalJson([
    shape,
    editor.isShapeOrAncestorLocked(shape),
    bounds && [bounds.x, bounds.y, bounds.w, bounds.h],
    transform && [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f]
  ]);
  // Keep the revision compact even for a drawing with thousands of native points.
  let hash = 0x811c9dc5;
  let second = 0x27d4eb2d;
  for (let i = 0; i < data.length; i++) {
    hash = Math.imul(hash ^ data.charCodeAt(i), 0x01000193);
    second = Math.imul(second ^ data.charCodeAt(i), 0x9e3779b1);
  }
  return (hash >>> 0).toString(36) + ':' + (second >>> 0).toString(36);
}

function shapeItem(editor: Editor, shape: TLShape): ContextItem {
  const geo = shape.type === 'geo' && 'geo' in shape.props ? shape.props.geo : undefined;
  const label = isLabelShape(shape);
  const editable = !editor.instanceState.isReadonly && !editor.isShapeOrAncestorLocked(shape);
  const connectable =
    editable && (label || shape.type === 'image') && editor.getShapeUtil(shape).canBind(shape);
  const item: ContextItem = {
    id: shape.id,
    type: typeof geo === 'string' ? geo : shape.type,
    version: itemVersion(editor, shape),
    parentId: shape.parentId,
    ...(label && editable ? { labelEditable: true } : {}),
    ...(connectable ? { connectable: true } : {})
  };
  const labelText = shapeText(shape);
  if (labelText !== undefined) item.text = labelText.slice(0, 280);
  if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
    if (shape.props.start.type === 'binding') item.from = shape.props.start.boundShapeId;
    if (shape.props.end.type === 'binding') item.to = shape.props.end.boundShapeId;
  }
  return item;
}

function boardContext(editor: Editor): AiContext {
  const selection = new Set(editor.selectedShapeIds);
  const shapes = editor.currentPageShapes;
  const prioritized = shapes
    .slice()
    .sort((a, b) => Number(selection.has(b.id)) - Number(selection.has(a.id)));
  const items = prioritized
    .slice(0, MAX_CONTEXT_ITEMS - 1)
    .map((shape) => shapeItem(editor, shape));
  return {
    kind: 'board',
    boardEngine: 'tldraw',
    selection: items.filter((item) => selection.has(item.id as TLShapeId)).map((item) => item.id),
    truncated: shapes.length >= MAX_CONTEXT_ITEMS,
    items: [
      { id: editor.currentPageId, type: 'page', text: editor.currentPage.name.slice(0, 280) },
      ...items
    ]
  };
}

function requiredText(value: JsonValue, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) {
    throw new AiEditValidationError('invalid', 'The model returned an invalid board operation.');
  }
  return value;
}

function planBoard(editor: Editor, operations: AiOperation[], base: AiContext) {
  if (
    base.kind !== 'board' ||
    base.boardEngine !== 'tldraw' ||
    editor.instanceState.isReadonly ||
    operations.length === 0 ||
    operations.length > 30
  ) {
    throw new AiEditValidationError('invalid', 'This board edit cannot be applied.');
  }
  const pageId = editor.currentPageId;
  const originalPage = base.items.find((item) => item.type === 'page');
  if (originalPage?.id !== pageId) {
    throw new AiEditValidationError(
      'stale',
      'The active canvas page changed while the edit was prepared.'
    );
  }

  const expected = new Map(base.items.map((item) => [item.id, item]));
  const existing = new Map(editor.currentPageShapes.map((shape) => [shape.id as string, shape]));
  const nodes = new Map<string, Target>();
  const created: TLShapePartial[] = [];
  const labels = new Map<TLShapeId, TLShapePartial<LabelShape>>();
  const bounds = editor.currentPageBounds;
  const viewport = editor.viewportPageBounds;
  const x = bounds ? bounds.maxX + 64 : viewport.center.x - NODE_WIDTH / 2;
  const y = bounds ? bounds.minY : viewport.center.y - NODE_HEIGHT / 2;

  function getExisting(id: string, action: 'labelEditable' | 'connectable') {
    const original = expected.get(id);
    const shape = existing.get(id);
    if (!original?.[action]) {
      throw new AiEditValidationError('target', 'This shape does not support the requested edit.');
    }
    if (!shape || original.version !== itemVersion(editor, shape)) {
      throw new AiEditValidationError(
        'stale',
        'A target shape changed while the edit was prepared.'
      );
    }
    if (!shapeItem(editor, shape)[action]) {
      throw new AiEditValidationError('target', 'This shape does not support the requested edit.');
    }
    return shape;
  }

  function getEndpoint(id: string): Target {
    const node = nodes.get(id);
    if (node) return node;
    const shape = getExisting(id, 'connectable');
    const center = editor.getShapePageBounds(shape)?.center;
    if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) {
      throw new AiEditValidationError('target', 'This shape cannot be connected.');
    }
    return { id: shape.id, x: center.x, y: center.y };
  }

  // Allocate node IDs first so connections can refer to any node declared in the batch.
  for (const operation of operations) {
    if (operation.type !== 'addNode') continue;
    const key = requiredText(operation.key, 80);
    const label = requiredText(operation.text, 180);
    const geo = operation.shape === undefined ? 'rectangle' : operation.shape;
    if (nodes.has(key) || existing.has(key) || expected.has(key) || !isNodeShape(geo)) {
      throw new AiEditValidationError('invalid', 'The model returned an invalid board node.');
    }
    const id = createShapeId();
    const nodeX = x + (nodes.size % 3) * (NODE_WIDTH + 80);
    const nodeY = y + Math.floor(nodes.size / 3) * (NODE_HEIGHT + 56);
    if (!Number.isFinite(nodeX) || !Number.isFinite(nodeY)) {
      throw new AiEditValidationError('target', 'There is no usable position for the new shape.');
    }
    nodes.set(key, { id, x: nodeX + NODE_WIDTH / 2, y: nodeY + NODE_HEIGHT / 2 });
    const partial: TLShapePartial<TLGeoShape> = {
      id,
      type: 'geo',
      parentId: pageId,
      x: nodeX,
      y: nodeY,
      props: {
        geo,
        w: NODE_WIDTH,
        h: NODE_HEIGHT,
        text: label,
        color: 'blue',
        fill: 'semi',
        dash: 'solid',
        font: 'sans'
      }
    };
    created.push(partial);
  }

  for (const operation of operations) {
    if (operation.type === 'addNode') continue;
    if (operation.type === 'setLabel') {
      const id = requiredText(operation.id, 160);
      const label = requiredText(operation.text, 240);
      const shape = getExisting(id, 'labelEditable');
      if (!isLabelShape(shape)) {
        throw new AiEditValidationError('target', 'This shape does not have an editable label.');
      }
      if (labels.has(shape.id)) {
        throw new AiEditValidationError('invalid', 'The model changed the same label twice.');
      }
      if (shape.props.text !== label) {
        labels.set(shape.id, { id: shape.id, type: shape.type, props: { text: label } });
      }
      continue;
    }
    if (operation.type === 'connect') {
      const start = getEndpoint(requiredText(operation.from, 160));
      const end = getEndpoint(requiredText(operation.to, 160));
      if (start.id === end.id) {
        throw new AiEditValidationError('invalid', 'A connection needs two different shapes.');
      }
      const partial: TLShapePartial<TLArrowShape> = {
        id: createShapeId(),
        type: 'arrow',
        parentId: pageId,
        x: start.x,
        y: start.y,
        props: {
          color: 'blue',
          dash: 'solid',
          start: {
            type: 'binding',
            boundShapeId: start.id,
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false
          },
          end: {
            type: 'binding',
            boundShapeId: end.id,
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false
          }
        }
      };
      created.push(partial);
      continue;
    }
    throw new AiEditValidationError('invalid', 'This board operation is unsupported.');
  }

  if (created.length + existing.size > MAX_SHAPES_PER_PAGE) {
    throw new AiEditValidationError('target', 'There is no room for more shapes on this page.');
  }
  if (!created.length && !labels.size) {
    throw new AiEditValidationError('unchanged', 'This edit does not change the canvas.');
  }
  return { created, labels: [...labels.values()] };
}

function readSnapshot(snapshot: JsonValue): NativeSnapshot {
  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    Array.isArray(snapshot) ||
    snapshot.format !== SNAPSHOT_FORMAT
  ) {
    throw new Error('This canvas version has an unsupported format.');
  }
  const data = snapshot.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('This canvas version is missing its native data.');
  }
  const { store, schema } = data;
  if (
    !store ||
    typeof store !== 'object' ||
    Array.isArray(store) ||
    !schema ||
    typeof schema !== 'object' ||
    Array.isArray(schema)
  ) {
    throw new Error('This canvas version is missing its native store or schema.');
  }
  for (const [id, record] of Object.entries(store)) {
    if (
      !record ||
      typeof record !== 'object' ||
      Array.isArray(record) ||
      record.id !== id ||
      typeof record.typeName !== 'string' ||
      !DOCUMENT_TYPES.has(record.typeName)
    ) {
      throw new Error('This canvas version contains an invalid record.');
    }
  }
  return data as unknown as NativeSnapshot;
}

function resolveDocumentPages(records: NativeSnapshot['store']) {
  const pagesByShape = new Map<TLShapeId, TLPageId>();
  const pages = Object.values(records).filter(
    (record): record is TLPage => record.typeName === 'page'
  );
  if (records[TLDOCUMENT_ID]?.typeName !== 'document' || !pages.length) {
    throw new Error('This canvas version is missing its document or pages.');
  }
  for (const record of Object.values(records)) {
    if (record.typeName !== 'shape' || pagesByShape.has(record.id)) continue;
    let current: TLRecord | undefined = record;
    const path = new Set<TLShapeId>();
    while (
      current?.typeName === 'shape' &&
      !pagesByShape.has(current.id) &&
      !path.has(current.id)
    ) {
      path.add(current.id);
      current = records[current.parentId];
    }
    const page =
      current?.typeName === 'page'
        ? current.id
        : current?.typeName === 'shape'
        ? pagesByShape.get(current.id)
        : undefined;
    if (!page) throw new Error('This canvas version has a missing or circular shape parent.');
    for (const id of path) pagesByShape.set(id, page);
  }
  return { pages, pagesByShape };
}

function restoreDocument(editor: Editor, snapshot: JsonValue) {
  if (editor.instanceState.isReadonly) throw new Error('This canvas is read-only.');
  const { store } = editor;
  const next = store.migrateSnapshot(readSnapshot(snapshot)).store;
  for (const record of Object.values(next))
    store.schema.validateRecord(store, record, 'tests', null);
  const { pages, pagesByShape } = resolveDocumentPages(next);
  const current = store.getSnapshot('document').store;
  const diff: RecordsDiff<TLRecord> = { added: {}, updated: {}, removed: {} };
  for (const record of Object.values(next)) {
    const previous = current[record.id];
    if (!previous) diff.added[record.id] = record;
    else if (canonicalJson(previous) !== canonicalJson(record))
      diff.updated[record.id] = [previous, record];
  }
  for (const previous of Object.values(current)) {
    if (!next[previous.id]) diff.removed[previous.id] = previous;
  }

  const instance = editor.instanceState;
  if (next[instance.currentPageId]?.typeName !== 'page') {
    const first = pages.reduce((a, b) => (a.index < b.index ? a : b));
    diff.updated[instance.id] = [instance, { ...instance, currentPageId: first.id }];
  }
  for (const page of pages) {
    const stateId = InstancePageStateRecordType.createId(page.id);
    if (!store.has(stateId)) {
      diff.added[stateId] = InstancePageStateRecordType.create({ id: stateId, pageId: page.id });
    }
    const cameraId = CameraRecordType.createId(page.id);
    if (!store.has(cameraId)) diff.added[cameraId] = CameraRecordType.create({ id: cameraId });
  }

  for (const state of editor.pageStates) {
    if (!next[state.pageId]) {
      diff.removed[state.id] = state;
      const cameraId = CameraRecordType.createId(state.pageId);
      const camera = store.get(cameraId);
      if (camera) diff.removed[cameraId] = camera;
      continue;
    }
    const isOnPage = (id: TLShapeId) => pagesByShape.get(id) === state.pageId;
    const keep = (id: TLShapeId | null) => (id && isOnPage(id) ? id : null);
    const cleaned = {
      ...state,
      selectedShapeIds: state.selectedShapeIds.filter(isOnPage),
      erasingShapeIds: state.erasingShapeIds.filter(isOnPage),
      hintingShapeIds: state.hintingShapeIds.filter(isOnPage),
      editingShapeId: keep(state.editingShapeId),
      hoveredShapeId: keep(state.hoveredShapeId),
      focusedGroupId: keep(state.focusedGroupId)
    };
    if (JSON.stringify(state) !== JSON.stringify(cleaned))
      diff.updated[state.id] = [state, cleaned];
  }

  editor.batch(() => {
    // Document side effects are intended for individual edits and can rewrite restored arrows.
    store.applyDiff(diff, false);
    editor.history.clear();
  });
}

function captureDocument(editor: Editor): JsonValue {
  // Native schema validation can reorder keys when a version is loaded.
  const data = editor.store.getSnapshot('document');
  return JSON.parse(canonicalJson({ format: SNAPSHOT_FORMAT, data })) as JsonValue;
}

export function createTldrawAdapter(
  docId: string,
  editor: Editor,
  flush: () => Promise<void>
): AiEditorAdapter {
  return {
    docId,
    kind: 'tldraw',
    context: () => boardContext(editor),
    capture: async () => captureDocument(editor),
    validate: (operations, base) => {
      planBoard(editor, operations, base);
    },
    apply(operations, base) {
      const { created, labels } = planBoard(editor, operations, base);
      editor.batch(() => {
        editor.mark();
        editor.createShapes(created);
        editor.updateShapes(labels);
      });
      if (created.length) {
        const bounds = created
          .map(({ id }) => editor.getShapePageBounds(id))
          .filter((box): box is Box2d => box !== undefined);
        const viewport = editor.viewportPageBounds;
        if (bounds.length && viewport.w > 0 && viewport.h > 0) {
          const createdBounds = Box2d.Common(bounds);
          if (!viewport.contains(createdBounds)) {
            editor.zoomToBounds(createdBounds, editor.zoomLevel);
          }
        }
      }
    },
    restore: async (snapshot) => restoreDocument(editor, snapshot),
    preview(snapshot) {
      const shapes = Object.values(readSnapshot(snapshot).store).filter(
        (record): record is TLShape => record.typeName === 'shape'
      );
      const labels = shapes.flatMap((shape) => {
        const label = shapeText(shape);
        return label?.trim() ? [label.slice(0, 280)] : [];
      });
      if (labels.length) return labels.slice(0, 12);
      return shapes.length ? [`${shapes.length} ${shapes.length === 1 ? 'shape' : 'shapes'}`] : [];
    },
    subscribe: (listener) => editor.store.listen(listener, { scope: 'document' }),
    flush,
    locate(ids) {
      const wanted = new Set(ids);
      const targets = editor.currentPageShapes
        .filter((shape) => wanted.has(shape.id))
        .map(({ id }) => id);
      if (targets.length) editor.setSelectedShapes(targets).zoomToSelection();
    }
  };
}
