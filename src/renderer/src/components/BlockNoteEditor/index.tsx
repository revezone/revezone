import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FileDown, FileUp } from 'lucide-react';
import type { BlockNoteEditor as Editor, PartialBlock } from '@blocknote/core';
import { en, zh, zhTW } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import {
  FileDownloadButton,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useComponentsContext,
  useCreateBlockNote,
  useEditorState,
  type FormattingToolbarProps
} from '@blocknote/react';
import { createBlockNoteAdapter } from '@renderer/ai/blockNoteAdapter';
import { registerAiEditor } from '@renderer/ai/editorRegistry';
import {
  blockNoteStorage,
  isValidBlockNoteLink,
  type BlockNoteDocument
} from '@renderer/store/blockNoteStorage';
import type { RevezoneFile } from '@renderer/types/file';
import { NoteAppearanceMenu, useNoteAppearance } from './NoteAppearance';
import '@blocknote/mantine/style.css';
import './index.css';

type Props = {
  file: RevezoneFile;
  initialDocument: BlockNoteDocument;
  onLinkOpen(href: string): void | Promise<void>;
};

const assetUrl = /^revezone-media:\/\/asset\/[a-f0-9]{64}$/;
const internalLink = /^revezone:\/\/[^\r\n]+$/;
const saveDelay = 250;

function webUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function mediaUrl(href: string) {
  return !href || assetUrl.test(href) || webUrl(href);
}

function defaultBody(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.length ? blocks : [{ type: 'paragraph' }];
}

function LocalFileButton({
  editor,
  label,
  onError
}: {
  editor: Editor;
  label: string;
  onError(): void;
}) {
  const Components = useComponentsContext();
  const file = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const selected = instance.getSelection()?.blocks ?? [instance.getTextCursorPosition().block];
      const block = selected.length === 1 ? selected[0] : undefined;
      if (
        block &&
        'url' in block.props &&
        'name' in block.props &&
        assetUrl.test(block.props.url)
      ) {
        return { url: block.props.url, name: block.props.name };
      }
      return undefined;
    }
  });
  if (!file) return <FileDownloadButton />;
  if (!Components || !window.noteAssets?.open) return null;
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={label}
      mainTooltip={label}
      icon={<ExternalLink size={15} />}
      onClick={() => void window.noteAssets?.open?.(file.url, file.name).catch(onError)}
    />
  );
}

export default function BlockNoteEditor({ file, initialDocument, onLinkOpen }: Props) {
  const { i18n } = useTranslation();
  const appearance = useNoteAppearance();
  const chinese = i18n.language.startsWith('zh');
  const dictionary = i18n.language.toLowerCase().includes('tw') ? zhTW : chinese ? zh : en;
  const strings = chinese
    ? {
        title: '笔记正文标题',
        importMarkdown: '导入 Markdown',
        exportMarkdown: '导出 Markdown 文本',
        exportHint: '本地附件保留为 Revezone 内的链接。',
        openFile: '打开附件',
        saveError: '笔记暂未保存。',
        retry: '重试保存',
        importError: '无法导入这份 Markdown 文件。',
        mediaError: '请上传本地附件，或使用 HTTP 或 HTTPS 附件链接。',
        openError: '无法打开附件。'
      }
    : {
        title: 'Note title',
        importMarkdown: 'Import Markdown',
        exportMarkdown: 'Export Markdown text',
        exportHint: 'Local attachments stay as links to Revezone.',
        openFile: 'Open attachment',
        saveError: 'Your note has not been saved.',
        retry: 'Retry save',
        importError: 'This Markdown file could not be imported.',
        mediaError: 'Upload the local attachment or use an HTTP or HTTPS attachment URL.',
        openError: 'This attachment could not be opened.'
      };
  const host = useRef<HTMLElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const titleRef = useRef(initialDocument.title);
  const linkHandler = useRef(onLinkOpen);
  const listeners = useRef(new Set<() => void>());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const [title, setTitleState] = useState(initialDocument.title);
  const [saveError, setSaveError] = useState(false);
  const [actionError, setActionError] = useState<'import' | 'media' | 'open'>();
  linkHandler.current = onLinkOpen;

  const editor = useCreateBlockNote(
    {
      dictionary,
      initialContent: defaultBody(initialDocument.blocks),
      uploadFile: (attachment) => {
        if (!window.noteAssets)
          return Promise.reject(new Error('Local attachment storage is unavailable.'));
        return window.noteAssets.save(attachment);
      },
      async resolveFileUrl(href) {
        if (mediaUrl(href)) return href;
        throw new Error('Unsupported attachment URL.');
      },
      links: {
        isValidLink: isValidBlockNoteLink,
        onClick(event) {
          const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
          const href = anchor?.getAttribute('href');
          if (!href) return false;
          event.preventDefault();
          if (internalLink.test(href)) void linkHandler.current(href);
          else if (webUrl(href)) window.open(href, '_blank', 'noopener,noreferrer');
          return true;
        }
      }
    },
    [file.id]
  );

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const currentRevision = revision.current;
    try {
      await blockNoteStorage.save(file.id, { title: titleRef.current, blocks: editor.document });
      savedRevision.current = Math.max(savedRevision.current, currentRevision);
      if (mounted.current && savedRevision.current === revision.current) setSaveError(false);
    } catch (reason) {
      if (mounted.current && savedRevision.current < currentRevision) setSaveError(true);
      throw reason;
    }
  }, [editor, file.id]);

  const markChanged = useCallback(() => {
    revision.current++;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush().catch(() => {}), saveDelay);
    for (const listener of listeners.current) listener();
  }, [flush]);

  const setTitle = useCallback(
    (value: string) => {
      if (value === titleRef.current) return;
      titleRef.current = value;
      if (mounted.current) setTitleState(value);
      markChanged();
    },
    [markChanged]
  );

  useEffect(() => {
    mounted.current = true;
    const unsubscribeBefore = editor.onBeforeChange(({ tr }) => {
      if (!tr.docChanged) return true;
      // A newly split block may not have an ID until BlockNote appends its next transaction.
      let invalid = false;
      tr.doc.descendants((node) => {
        const url = node.attrs.url;
        if (typeof url === 'string' && !mediaUrl(url)) invalid = true;
        return !invalid;
      });
      if (invalid) setActionError('media');
      return !invalid;
    });
    const unsubscribe = editor.onChange(markChanged);
    const unregister = registerAiEditor(
      createBlockNoteAdapter({
        docId: file.id,
        editor,
        getTitle: () => titleRef.current,
        setTitle,
        subscribe(listener) {
          listeners.current.add(listener);
          return () => {
            listeners.current.delete(listener);
          };
        },
        flush,
        getHost: () => host.current
      })
    );
    return () => {
      mounted.current = false;
      unsubscribeBefore();
      unsubscribe();
      unregister();
      clearTimeout(saveTimer.current);
      if (savedRevision.current < revision.current) {
        void flush().catch((reason) => console.error('Could not close BlockNote document', reason));
      }
    };
  }, [editor, file.id, flush, markChanged, setTitle]);

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setActionError(undefined);
    try {
      const markdown = await file.text();
      if (!mounted.current) return;
      let missingMedia = false;
      const normalizeMedia = (block: PartialBlock): PartialBlock => {
        const children = block.children?.map(normalizeMedia);
        if (block.props && 'url' in block.props && block.props.url && !mediaUrl(block.props.url)) {
          missingMedia = true;
          return {
            ...block,
            children,
            props: { ...block.props, name: block.props.name || block.props.url, url: '' }
          } as PartialBlock;
        }
        return { ...block, children };
      };
      const blocks = editor.tryParseMarkdownToBlocks(markdown).map(normalizeMedia);
      if (!blocks.length) return;
      if (missingMedia) setActionError('media');
      const document = editor.document;
      const last = document.at(-1);
      if (
        document.length === 1 &&
        last?.type === 'paragraph' &&
        !last.content.length &&
        !last.children.length
      ) {
        editor.replaceBlocks(document, blocks);
      } else if (last) {
        editor.insertBlocks(blocks, last, 'after');
      }
    } catch {
      if (mounted.current) setActionError('import');
    }
  }

  function exportMarkdown() {
    const title = titleRef.current.trim();
    const blocks: PartialBlock[] = title
      ? [{ type: 'heading', props: { level: 1 }, content: title }, ...editor.document]
      : editor.document;
    const markdown = editor.blocksToMarkdownLossy(blocks);
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (file.name || 'note').replace(/[\\/:*?"<>|\p{Cc}]/gu, '_') + '.md';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const formattingToolbar = useCallback(
    (props: FormattingToolbarProps) => (
      <FormattingToolbar {...props}>
        {getFormattingToolbarItems(props.blockTypeSelectItems).map((item) =>
          item.key === 'fileDownloadButton' ? (
            <LocalFileButton
              key={item.key}
              editor={editor}
              label={strings.openFile}
              onError={() => setActionError('open')}
            />
          ) : (
            item
          )
        )}
      </FormattingToolbar>
    ),
    [editor, strings.openFile]
  );

  return (
    <section
      className="rz-note"
      ref={host}
      data-testid="block-note-editor"
      data-note-layout={appearance.layout}
      data-note-color={appearance.color}
      data-note-color-preference={appearance.preference}
    >
      <div className="rz-note-shell">
        <div className="rz-note-actions">
          <NoteAppearanceMenu {...appearance} />
          <button
            type="button"
            data-testid="note-import-markdown"
            onClick={() => upload.current?.click()}
          >
            <FileUp size={15} aria-hidden="true" /> {strings.importMarkdown}
          </button>
          <button
            type="button"
            data-testid="note-export-markdown"
            title={strings.exportHint}
            onClick={exportMarkdown}
          >
            <FileDown size={15} aria-hidden="true" /> {strings.exportMarkdown}
          </button>
          <input
            ref={upload}
            type="file"
            data-testid="note-markdown-file"
            accept=".md,.markdown,text/markdown"
            onChange={(event) => void importMarkdown(event)}
            hidden
          />
        </div>
        {saveError && (
          <p className="rz-note-error" role="alert">
            {strings.saveError}{' '}
            <button type="button" onClick={() => void flush().catch(() => {})}>
              {strings.retry}
            </button>
          </p>
        )}
        {actionError && (
          <p className="rz-note-error" role="alert">
            {actionError === 'import'
              ? strings.importError
              : actionError === 'media'
              ? strings.mediaError
              : strings.openError}
          </p>
        )}
        <input
          className="rz-note-title"
          aria-label={strings.title}
          value={title}
          placeholder={file.name}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key !== 'Enter' ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.nativeEvent.isComposing ||
              event.nativeEvent.keyCode === 229
            ) {
              return;
            }
            event.preventDefault();
            const firstTextBlock = editor.document.find((block) => block.content !== undefined);
            if (firstTextBlock) editor.setTextCursorPosition(firstTextBlock, 'start');
            editor.focus();
          }}
        />
        <BlockNoteView editor={editor} theme={appearance.color} formattingToolbar={false}>
          <FormattingToolbarController formattingToolbar={formattingToolbar} />
        </BlockNoteView>
      </div>
    </section>
  );
}
