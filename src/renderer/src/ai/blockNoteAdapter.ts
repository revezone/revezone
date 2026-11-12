import type { Block, BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { blockNoteStorage, type BlockNoteDocument } from '@renderer/store/blockNoteStorage';
import { parseResearchParagraphs } from './communityResearch';
import {
  AiEditValidationError,
  type AiContext,
  type AiEditorAdapter,
  type AiOperation
} from './editorRegistry';

type NoteItem = AiContext['items'][number];
type Inline = Extract<Block['content'], unknown[]>[number];
type TextRun = Extract<Inline, { type: 'text' }>;

const CONTEXT_ITEMS = 120;
const CONTEXT_BUDGET = 30_000;
const TEXT_LIMIT = 3200;

const editableTypes = new Set([
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem'
]);

function inlineText(content: Inline) {
  return content.type === 'link' ? content.content.map((run) => run.text).join('') : content.text;
}

function textOf(block: Block) {
  if (Array.isArray(block.content)) return block.content.map(inlineText).join('');
  if (block.content?.type === 'tableContent') {
    return block.content.rows
      .map(({ cells }) =>
        cells
          .map((cell) => (Array.isArray(cell) ? cell : cell.content).map(inlineText).join(''))
          .join('\t')
      )
      .join('\n');
  }
  if ('caption' in block.props) {
    return [block.props.name, block.props.caption].filter(Boolean).join(' ');
  }
  return '';
}

function revision(block: Block) {
  const input = JSON.stringify(block.content ?? null);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16);
}

function indexBlocks(blocks: Block[], docId: string) {
  const index = new Map<string, { block: Block; parentId: string }>();
  function visit(children: Block[], parentId: string) {
    for (const block of children) {
      index.set(block.id, { block, parentId });
      visit(block.children, block.id);
    }
  }
  visit(blocks, docId);
  return index;
}

function itemOf(block: Block, parentId: string): NoteItem {
  const text = textOf(block);
  const type = editableTypes.has(block.type)
    ? block.type.endsWith('ListItem')
      ? 'list'
      : 'paragraph'
    : block.type;
  return {
    id: block.id,
    parentId,
    type,
    ...(type !== block.type ? { blockType: block.type } : {}),
    text: text.slice(0, TEXT_LIMIT),
    textRevision: revision(block),
    ...(text.length > TEXT_LIMIT ? { textTruncated: true } : {})
  };
}

function contextFor(docId: string, editor: BlockNoteEditor, title: string): AiContext {
  const blocks = indexBlocks(editor.document, docId);
  const selection = editor.getSelection()?.blocks.map(({ id }) => id) ?? [];
  const { $from, $to } = editor.prosemirrorState.selection;
  const singleRange =
    selection.length === 1 &&
    $from.sameParent($to) &&
    $from.parent.inlineContent &&
    $from.parentOffset < $to.parentOffset;
  const included = new Map<string, NoteItem>();
  const page: NoteItem = { id: docId, type: 'page', text: title.slice(0, TEXT_LIMIT) };
  let remaining = CONTEXT_BUDGET - JSON.stringify(page).length;
  let count = 1;
  let truncated = false;

  const include = (id: string) => {
    if (included.has(id)) return true;
    const entry = blocks.get(id);
    if (!entry || count >= CONTEXT_ITEMS) return false;
    const item = itemOf(entry.block, entry.parentId);
    if (selection.includes(id)) {
      if (singleRange && Array.isArray(entry.block.content)) {
        item.selectionStart = $from.parentOffset;
        item.selectionEnd = $to.parentOffset;
        item.selectedText = textOf(entry.block)
          .slice($from.parentOffset, $to.parentOffset)
          .slice(0, TEXT_LIMIT);
      } else {
        item.selectionPartial = true;
      }
    }
    const cost = JSON.stringify(item).length;
    if (cost > remaining) return false;
    remaining -= cost;
    count++;
    if (item.textTruncated) truncated = true;
    included.set(id, item);
    return true;
  };

  for (const id of selection) if (!include(id)) truncated = true;
  const items = [page];
  for (const id of blocks.keys()) {
    if (!include(id)) {
      truncated = true;
      break;
    }
    items.push(included.get(id)!);
    included.delete(id);
  }
  for (const item of included.values()) items.push({ ...item, outsideDocumentPrefix: true });
  return {
    kind: 'note',
    items,
    selection: selection.filter((id) => items.some((item) => item.id === id)),
    truncated
  };
}

function operationText(operation: AiOperation) {
  if (
    typeof operation.text !== 'string' ||
    !operation.text.trim() ||
    operation.text.length > 5000 ||
    operation.text.includes('\0')
  ) {
    throw new AiEditValidationError('invalid', 'The proposed paragraph needs valid plain text.');
  }
  return operation.text;
}

function replaceRange(content: Inline[], start: number, end: number, text: string): Inline[] {
  const before: Inline[] = [];
  const after: Inline[] = [];
  let styles: TextRun['styles'] | undefined;
  let offset = 0;
  for (const run of content) {
    const next = offset + inlineText(run).length;
    if (next <= start) before.push(run);
    else if (offset >= end) after.push(run);
    else {
      if (
        run.type !== 'text' ||
        (styles && JSON.stringify(styles) !== JSON.stringify(run.styles))
      ) {
        throw new AiEditValidationError(
          'format',
          'Select text with one style and without links, or insert a new paragraph.'
        );
      }
      styles = run.styles;
      if (offset < start) before.push({ ...run, text: run.text.slice(0, start - offset) });
      if (next > end) after.push({ ...run, text: run.text.slice(end - offset) });
    }
    offset = next;
  }
  return [...before, { type: 'text', text, styles: styles ?? {} }, ...after];
}

function planOperations(
  docId: string,
  editor: BlockNoteEditor,
  operations: AiOperation[],
  base: AiContext
) {
  if (
    !editor.isEditable ||
    base.kind !== 'note' ||
    operations.length === 0 ||
    operations.length > 30
  ) {
    throw new AiEditValidationError('invalid', 'This note edit cannot be applied.');
  }
  const existing = indexBlocks(editor.document, docId);
  const expected = new Map(base.items.map((item) => [item.id, item]));
  const replacements = new Set<string>();
  const insertionTails = new Map<string, string>();
  const changes: (() => void)[] = [];

  function target(id: unknown) {
    const prior = typeof id === 'string' ? expected.get(id) : undefined;
    if (!prior || prior.id === docId) {
      throw new AiEditValidationError('target', 'Choose a paragraph in the current note.');
    }
    const current = existing.get(prior.id);
    if (!current)
      throw new AiEditValidationError('stale', 'The target paragraph is no longer available.');
    const item = itemOf(current.block, current.parentId);
    if (
      prior.type !== item.type ||
      prior.parentId !== item.parentId ||
      prior.textRevision !== item.textRevision
    ) {
      throw new AiEditValidationError(
        'stale',
        'The target paragraph changed. Send the instruction again.'
      );
    }
    return { prior, block: current.block };
  }

  function append(blocks: PartialBlock[]) {
    changes.push(() => editor.insertBlocks(blocks, editor.document.at(-1)!, 'after'));
  }

  for (const operation of operations) {
    switch (operation.type) {
      case 'replaceText': {
        const { prior, block } = target(operation.id);
        const content = block.content;
        if (!editableTypes.has(block.type) || !Array.isArray(content)) {
          throw new AiEditValidationError('target', 'Choose a paragraph or list item to replace.');
        }
        if (prior.selectionPartial)
          throw new AiEditValidationError('range', 'Choose a single text range to replace.');
        if (replacements.has(block.id))
          throw new AiEditValidationError(
            'invalid',
            'Use a single replacement for each paragraph.'
          );
        const original = textOf(block);
        const start = prior.selectionStart ?? 0;
        const end = prior.selectionEnd ?? original.length;
        if (
          typeof start !== 'number' ||
          typeof end !== 'number' ||
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 0 ||
          end < start ||
          end > original.length ||
          (prior.textTruncated && prior.selectionStart === undefined) ||
          (prior.selectedText !== undefined && original.slice(start, end) !== prior.selectedText)
        ) {
          throw new AiEditValidationError(
            'range',
            'The selected text changed or is too large. Select a shorter range and try again.'
          );
        }
        const text = operationText(operation);
        replacements.add(block.id);
        if (original.slice(start, end) === text) break;
        const replacement = replaceRange(content, start, end, text);
        changes.push(() => editor.updateBlock(block, { content: replacement }));
        break;
      }
      case 'insertParagraph': {
        const { block } = target(operation.afterId);
        const text = operationText(operation);
        changes.push(() => {
          const [inserted] = editor.insertBlocks(
            [{ type: 'paragraph', content: text }],
            insertionTails.get(block.id) ?? block.id,
            'after'
          );
          insertionTails.set(block.id, inserted.id);
        });
        break;
      }
      case 'appendParagraph':
        append([{ type: 'paragraph', content: operationText(operation) }]);
        break;
      case 'appendResearch': {
        const { query, results } = parseResearchParagraphs(operation);
        append([
          { type: 'heading', props: { level: 2 }, content: query },
          ...results.map(
            ({ title, url, details }): PartialBlock => ({
              type: 'paragraph',
              content: [
                { type: 'link', href: url, content: [{ type: 'text', text: title, styles: {} }] },
                { type: 'text', text: details, styles: {} }
              ]
            })
          )
        ]);
        break;
      }
      default:
        throw new AiEditValidationError('invalid', 'This type of note edit is unavailable.');
    }
  }
  if (!changes.length)
    throw new AiEditValidationError(
      'unchanged',
      'The proposed edit would leave the note unchanged.'
    );
  return changes;
}

export function createBlockNoteAdapter({
  docId,
  editor,
  getTitle,
  setTitle,
  subscribe,
  flush,
  getHost
}: {
  docId: string;
  editor: BlockNoteEditor;
  getTitle(): string;
  setTitle(title: string): void;
  subscribe(listener: () => void): () => void;
  flush(): Promise<void>;
  getHost(): HTMLElement | null;
}): AiEditorAdapter {
  const document = (): BlockNoteDocument => ({ title: getTitle(), blocks: editor.document });
  return {
    docId,
    kind: 'note',
    context: () => contextFor(docId, editor, getTitle()),
    capture: () => blockNoteStorage.capture(docId, document()),
    preview: (snapshot) => blockNoteStorage.preview(snapshot),
    validate(operations, base) {
      planOperations(docId, editor, operations, base);
    },
    apply(operations, base) {
      const changes = planOperations(docId, editor, operations, base);
      editor.transact(() => changes.forEach((change) => change()));
    },
    async restore(snapshot) {
      const before = JSON.stringify(document());
      const restored = await blockNoteStorage.prepareRestore(docId, snapshot, true);
      if (!getHost()?.isConnected || JSON.stringify(document()) !== before) {
        throw new Error('The note changed while the version was loading. Try again.');
      }
      editor.replaceBlocks(
        editor.document,
        restored.blocks.length ? restored.blocks : [{ type: 'paragraph' }]
      );
      setTitle(restored.title);
      await flush();
    },
    subscribe,
    flush,
    locate(ids) {
      const host = getHost();
      const target = ids
        .map((id) => host?.querySelector(`[data-id="${CSS.escape(id)}"]`))
        .find(Boolean);
      target?.scrollIntoView({ block: 'center' });
    }
  };
}
