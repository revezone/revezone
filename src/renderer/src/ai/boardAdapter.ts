import { newElementWith, restoreElements } from 'revedraw';
import type { ExcalidrawElement, ExcalidrawTextElement } from 'revedraw/types/element/types';
import type { BinaryFiles, ExcalidrawImperativeAPI } from 'revedraw/types/types';
import type { JsonValue } from '../../../shared/versionHistory';
import { AiEditValidationError } from './editorRegistry';
import type { AiContext, AiEditorAdapter, AiOperation } from './editorRegistry';

type BoardSnapshot = {
  format: 'revezone-board-v1';
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  background: string;
};

export function readBoard(api: ExcalidrawImperativeAPI): BoardSnapshot {
  const elements = api.getSceneElements();
  const files = api.getFiles();
  const usedFiles: BinaryFiles = {};
  for (const element of elements) {
    if (element.type === 'image' && element.fileId) {
      const file = files[element.fileId];
      if (file) usedFiles[element.fileId] = file;
    }
  }
  return {
    format: 'revezone-board-v1',
    elements,
    files: usedFiles,
    background: api.getAppState().viewBackgroundColor
  };
}

export function parseBoardSnapshot(snapshot: JsonValue): BoardSnapshot {
  const value = snapshot as unknown as BoardSnapshot;
  if (
    value?.format !== 'revezone-board-v1' ||
    !Array.isArray(value.elements) ||
    !value.files ||
    typeof value.files !== 'object' ||
    typeof value.background !== 'string'
  ) {
    throw new Error('This board version has an unsupported format.');
  }
  return value;
}

function boardContext(api: ExcalidrawImperativeAPI): AiContext {
  const selection = Object.keys(api.getAppState().selectedElementIds);
  const elements = api.getSceneElements();
  const prioritized = [...elements].sort(
    (a, b) => Number(selection.includes(b.id)) - Number(selection.includes(a.id))
  );
  return {
    kind: 'board',
    selection,
    truncated: elements.length > 100,
    items: prioritized.slice(0, 100).map((element) => ({
      id: element.id,
      type: element.type,
      version: element.versionNonce,
      ...(element.type === 'text'
        ? { text: element.text.slice(0, 280), parentId: element.containerId ?? undefined }
        : {}),
      ...(element.type === 'arrow'
        ? {
            from: element.startBinding?.elementId,
            to: element.endBinding?.elementId
          }
        : {})
    }))
  };
}

function requireString(value: JsonValue, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) {
    throw new AiEditValidationError('invalid', 'The model returned an invalid board operation.');
  }
  return value;
}

function normalize(draft: Record<string, unknown>[]) {
  return restoreElements(draft as unknown as ExcalidrawElement[], null);
}

function planBoard(api: ExcalidrawImperativeAPI, operations: AiOperation[], base: AiContext) {
  if (base.kind !== 'board' || operations.length === 0 || operations.length > 30) {
    throw new AiEditValidationError('invalid', 'This board edit cannot be applied.');
  }
  const original = api.getSceneElementsIncludingDeleted();
  const initialElements = new Map(original.map((element) => [element.id, element]));
  const elements = new Map(initialElements);
  const expected = new Map(base.items.map((item) => [item.id, item]));
  const newIds = new Map<string, string>();
  const touched = new Set<string>();
  let nodeCount = 0;
  const visible = original.filter((element) => !element.isDeleted);
  const right = visible.reduce(
    (value, element) => Math.max(value, element.x + element.width),
    -Infinity
  );
  const top = visible.reduce((value, element) => Math.min(value, element.y), Infinity);
  const startX = Number.isFinite(right) ? right + 130 : 100;
  const startY = Number.isFinite(top) ? top : 100;

  function find(id: string) {
    const generated = newIds.get(id);
    const element = elements.get(generated ?? id);
    const initial = initialElements.get(id);
    if (
      !element ||
      element.isDeleted ||
      (!generated && (!initial || expected.get(id)?.version !== initial.versionNonce))
    ) {
      throw new AiEditValidationError(
        'stale',
        'A target on the board changed or no longer exists. Ask the AI to try again.'
      );
    }
    return element;
  }

  for (const operation of operations) {
    if (operation.type === 'addNode') {
      const key = requireString(operation.key, 80);
      const text = requireString(operation.text, 180);
      const shape = operation.shape ?? 'rectangle';
      if (
        newIds.has(key) ||
        elements.has(key) ||
        typeof shape !== 'string' ||
        !['rectangle', 'ellipse', 'diamond'].includes(shape)
      ) {
        throw new AiEditValidationError(
          'invalid',
          'The model returned an invalid or duplicate node.'
        );
      }
      const id = crypto.randomUUID();
      const label = crypto.randomUUID();
      const x = startX + (nodeCount % 3) * 270;
      const y = startY + Math.floor(nodeCount / 3) * 148;
      const width = 210;
      const height = 84;
      const [node, caption] = normalize([
        {
          id,
          type: shape,
          x,
          y,
          width,
          height,
          strokeColor: '#1e40af',
          backgroundColor: '#e7f0fb',
          fillStyle: 'solid',
          roughness: 1,
          boundElements: [{ id: label, type: 'text' }]
        },
        {
          id: label,
          type: 'text',
          x: x + 12,
          y: y + 28,
          width: width - 24,
          height: 28,
          text,
          originalText: text,
          strokeColor: '#1e3a5f',
          fontSize: 19,
          fontFamily: 2,
          textAlign: 'center',
          verticalAlign: 'middle',
          containerId: id
        }
      ]);
      elements.set(id, node);
      elements.set(label, caption);
      newIds.set(key, id);
      touched.add(id);
      nodeCount++;
    } else if (operation.type === 'setLabel') {
      const element = find(requireString(operation.id, 120));
      const text = requireString(operation.text, 240);
      if (element.type !== 'text') {
        throw new AiEditValidationError('target', 'Only text elements can be renamed.');
      }
      const updated = newElementWith(element as ExcalidrawTextElement, {
        text,
        originalText: text
      });
      if (updated === element) continue;
      elements.set(element.id, updated);
      touched.add(element.id);
    } else if (operation.type === 'connect') {
      const from = find(requireString(operation.from, 120));
      const to = find(requireString(operation.to, 120));
      const supported = ['rectangle', 'ellipse', 'diamond', 'text', 'image'];
      if (from.id === to.id || !supported.includes(from.type) || !supported.includes(to.type)) {
        throw new AiEditValidationError('target', 'A connection needs two different shapes.');
      }
      const id = crypto.randomUUID();
      const dx = to.x + to.width / 2 - (from.x + from.width / 2);
      const dy = to.y + to.height / 2 - (from.y + from.height / 2);
      if (Math.hypot(dx, dy) < 10) {
        throw new AiEditValidationError(
          'target',
          'Move the overlapping shapes apart before connecting them.'
        );
      }
      const gap = 5;
      const distanceToEdge = (element: ExcalidrawElement) =>
        Math.min(
          Math.abs(dx) > 0 ? (element.width / 2 + gap) / Math.abs(dx) : Infinity,
          Math.abs(dy) > 0 ? (element.height / 2 + gap) / Math.abs(dy) : Infinity,
          0.46
        );
      const begin = distanceToEdge(from);
      const end = distanceToEdge(to);
      const arrowX = dx * (1 - begin - end);
      const arrowY = dy * (1 - begin - end);
      const [arrow] = normalize([
        {
          id,
          type: 'arrow',
          x: from.x + from.width / 2 + dx * begin,
          y: from.y + from.height / 2 + dy * begin,
          width: Math.abs(arrowX),
          height: Math.abs(arrowY),
          points: [
            [0, 0],
            [arrowX, arrowY]
          ],
          strokeColor: '#426285',
          endArrowhead: 'arrow',
          startBinding: { elementId: from.id, focus: 0, gap },
          endBinding: { elementId: to.id, focus: 0, gap }
        }
      ]);
      elements.set(id, arrow);
      for (const node of [from, to]) {
        elements.set(
          node.id,
          newElementWith(node, {
            boundElements: [...(node.boundElements ?? []), { id, type: 'arrow' }]
          })
        );
      }
      touched.add(id);
    } else {
      throw new AiEditValidationError('invalid', 'This board edit is not supported.');
    }
  }
  if (!touched.size) {
    throw new AiEditValidationError(
      'unchanged',
      'The suggested edit would leave the board unchanged.'
    );
  }
  return {
    elements: Array.from(elements.values()),
    targets: Array.from(touched, (id) => elements.get(id)!)
  };
}

function applyBoard(api: ExcalidrawImperativeAPI, operations: AiOperation[], base: AiContext) {
  const { elements, targets } = planBoard(api, operations, base);
  api.updateScene({
    elements,
    commitToHistory: true,
    appState: { selectedElementIds: Object.fromEntries(targets.map(({ id }) => [id, true])) }
  });
  api.scrollToContent(targets);
}

export function createBoardAdapter(
  docId: string,
  api: ExcalidrawImperativeAPI,
  listeners: Set<() => void>,
  flush: () => Promise<void>
): AiEditorAdapter {
  return {
    docId,
    kind: 'board',
    context: () => boardContext(api),
    capture: async () => JSON.parse(JSON.stringify(readBoard(api))) as JsonValue,
    validate(operations, base) {
      planBoard(api, operations, base);
    },
    apply: (operations, base) => applyBoard(api, operations, base),
    restore: async (snapshot) => {
      const value = parseBoardSnapshot(snapshot);
      api.addFiles(Object.values(value.files));
      api.updateScene({
        elements: value.elements,
        appState: { viewBackgroundColor: value.background, selectedElementIds: {} },
        commitToHistory: true
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    flush,
    locate: (ids) => {
      const targets = api.getSceneElements().filter((element) => ids.includes(element.id));
      if (targets.length) api.scrollToContent(targets, { animate: true });
    }
  };
}
