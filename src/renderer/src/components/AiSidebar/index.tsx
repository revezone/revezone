import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUp,
  Clock3,
  FileText,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  Sparkles
} from 'lucide-react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import type { AiContext, AiResult, AiStatus, AiTurn } from '../../../../shared/ai';
import type { ModelBackend } from '../../../../shared/modelConfig';
import type { VersionRecord } from '../../../../shared/versionHistory';
import {
  AiEditValidationError,
  applyAiOperations,
  AppliedSaveError,
  type AiEditorAdapter,
  lookupAiEditor,
  restoreAiVersion,
  saveManualVersion,
  subscribeAiEditors
} from '@renderer/ai/editorRegistry';
import { researchNoteOperation } from '@renderer/ai/communityResearch';
import { currentFileAtom, fileTreeAtom, tabModelAtom } from '@renderer/store/jotai';
import { emitter, events } from '@renderer/store/eventemitter';
import useAddFile from '@renderer/hooks/useAddFile';
import { getAgentModelStrings } from '../SystemSettings/agentModelStrings';
import CommunityPanel, { communityTabLabel } from './CommunityPanel';
import HistoryPanel from './HistoryPanel';
import ResearchSources, { ResearchAnswer } from './ResearchSources';
import { getAiStrings, type AiStrings } from './strings';
import useSidebarWidth from './useSidebarWidth';
import './index.css';

type ChatEntry = AiTurn & {
  edit?: { before: string; after: string; changedIds: string[]; restored?: boolean };
  research?: AiResult['research'];
  researchSaveUnconfirmed?: boolean;
};
type Proposal = { result: AiResult; base: AiContext; docId: string };
type Conversation = { messages: ChatEntry[]; proposal?: Proposal; error?: string };
type StreamingReply = { docId: string; message: string };
const EMPTY: Conversation = { messages: [] };
const chineseResearchReference = String.raw`(?:(?:这些|这批|上面|刚才|上条|上一条)(?:的)?\s*(?:原帖|来源|检索结果|搜索结果|引用|结果|链接)?|它们|检索结果|搜索结果)`;
const chineseResearchSave = new RegExp(
  String.raw`^(?:(?:请(?:帮我)?|帮我|麻烦你?)\s*)?(?:(?:把|将)\s*${chineseResearchReference}\s*(?:整理|写|保存|追加|收录|放|记)|(?:保存|整理|追加|收录|添加|写)\s*${chineseResearchReference})\s*(?:进|入|到|至)\s*(?:当前|这篇|本篇|这份)?\s*(?:笔记|文档)(?:里|中)?[。！？.!?]?$`,
  'u'
);
const englishResearchSave =
  /^(?:(?:please|can you|could you|would you)\s+)?(?:add|save|append|insert|write|put|record)\s+(?:them|(?:these|those|the(?: last| previous)?)\s+(?:(?:search|research)\s+)?(?:sources|results|links|citations|findings))\s+(?:to|into|in)\s+(?:(?:the|my)\s+)?(?:(?:current|this)\s+)?(?:note|document)[.!?]?$/i;

function waitForEditor(docId: string) {
  return new Promise<NonNullable<ReturnType<typeof lookupAiEditor>>>((resolve, reject) => {
    const ready = () => {
      const adapter = lookupAiEditor(docId);
      if (adapter) {
        clearTimeout(timer);
        unsubscribe();
        resolve(adapter);
      }
    };
    const unsubscribe = subscribeAiEditors(ready);
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('The new document could not be opened.'));
    }, 7000);
    ready();
  });
}

function messageOf(reason: unknown) {
  return reason instanceof Error
    ? reason.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
    : String(reason);
}

function editError(reason: unknown, strings: AiStrings, kind: AiEditorAdapter['kind']) {
  if (kind === 'note' && reason instanceof AiEditValidationError)
    return strings.noteEditErrors[reason.reason];
  if (reason instanceof AppliedSaveError) return strings.persistError;
  return messageOf(reason);
}

export default function AiWorkspace({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const strings = getAiStrings(i18n.language);
  const modelStrings = getAgentModelStrings(i18n.language);
  const file = useAtomValue(currentFileAtom);
  const fileTree = useAtomValue(fileTreeAtom);
  const tabModel = useAtomValue(tabModelAtom);
  const { addFile } = useAddFile();
  const docId =
    file?.type === 'note' || file?.type === 'board' || file?.type === 'tldraw' ? file.id : '';
  const documentName = fileTree[docId]?.data.name ?? file?.name;
  const activeDoc = useRef(docId);
  activeDoc.current = docId;
  const adapter = useSyncExternalStore(subscribeAiEditors, () => lookupAiEditor(docId));
  const [open, setOpen] = useState(true);
  const expandButton = useRef<HTMLButtonElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  const moveToggleFocus = useRef(false);
  const sidebarSize = useSidebarWidth();
  const [view, setView] = useState<'chat' | 'community' | 'history'>('chat');
  const [draft, setDraft] = useState('');
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [status, setStatus] = useState<AiStatus>();
  const [backend, setBackend] = useState<ModelBackend>();
  const [switchingBackend, setSwitchingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string>();
  const [pending, setPending] = useState<'chat' | 'suggest' | 'write'>();
  const [streamingReply, setStreamingReply] = useState<StreamingReply>();
  const pendingRef = useRef(false);
  const [proactive, setProactive] = useState<Record<string, boolean>>({});
  const lastSuggestion = useRef(new Map<string, { content: string; time: number }>());
  const lastDismissed = useRef(new Map<string, string>());
  const chatContent = useRef<HTMLDivElement>(null);
  const followChat = useRef(true);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = conversations[docId] ?? EMPTY;
  const preview = streamingReply?.docId === docId ? streamingReply.message : undefined;
  const recentMessages = [...conversation.messages].reverse();
  const latestResearch = recentMessages.find((entry) => entry.research?.posts.length);
  const previousResearchQuery = recentMessages.find((entry) => entry.research?.query)?.research
    ?.query;
  const statusRequest = useRef(0);

  useEffect(() => {
    if (!moveToggleFocus.current) return;
    moveToggleFocus.current = false;
    (open ? collapseButton.current : expandButton.current)?.focus();
  }, [open]);

  function setSidebarOpen(next: boolean) {
    moveToggleFocus.current = true;
    setOpen(next);
  }

  const refreshStatus = useCallback(async () => {
    const request = ++statusRequest.current;
    void window.revezoneModel?.get().then(
      (settings) => {
        if (request === statusRequest.current) setBackend(settings.backend);
      },
      () => undefined
    );
    try {
      const result = await window.revezoneAi?.status();
      if (request === statusRequest.current) setStatus(result);
    } catch {
      if (request === statusRequest.current) setStatus({ ready: false, model: '', local: true });
    }
  }, []);

  useEffect(() => {
    if (window.revezoneAi) void refreshStatus();
    const reconnect = () => {
      setBackendError(undefined);
      setStatus(undefined);
      void refreshStatus();
    };
    emitter.on(events.AGENT_MODEL_SETTINGS_SAVED, reconnect);
    return () => {
      statusRequest.current++;
      emitter.off(events.AGENT_MODEL_SETTINGS_SAVED, reconnect);
    };
  }, [refreshStatus]);

  async function switchBackend(next: ModelBackend) {
    const settings = window.revezoneModel;
    if (!settings || next === backend || pendingRef.current) return;
    pendingRef.current = true;
    setSwitchingBackend(true);
    setBackendError(undefined);
    try {
      const saved = await settings.save({ backend: next });
      setBackend(saved.backend);
      setStatus(undefined);
      await refreshStatus();
    } catch (reason) {
      setBackendError(messageOf(reason));
    } finally {
      pendingRef.current = false;
      setSwitchingBackend(false);
    }
  }
  useEffect(() => {
    setDraft('');
  }, [docId]);
  useEffect(() => {
    followChat.current = true;
  }, [docId, view, open]);
  useEffect(() => {
    const content = chatContent.current;
    if (view === 'chat' && open && followChat.current && content) {
      content.scrollTop = content.scrollHeight;
    }
  }, [docId, conversation, pending, preview, view, open]);

  const update = useCallback(
    (id: string, updateConversation: (entry: Conversation) => Conversation) => {
      setConversations((all) => ({ ...all, [id]: updateConversation(all[id] ?? EMPTY) }));
    },
    []
  );

  const trySuggestion = useCallback(async () => {
    if (!adapter || pendingRef.current || lookupAiEditor(docId) !== adapter) return;
    const base = adapter.context();
    if (!base.items.length) return;
    const content = JSON.stringify(base.items);
    const last = lastSuggestion.current.get(docId);
    if (last && (last.content === content || Date.now() - last.time < 24000)) return;
    lastSuggestion.current.set(docId, { content, time: Date.now() });
    pendingRef.current = true;
    setPending('suggest');
    try {
      const result = await window.revezoneAi?.request({
        mode: 'suggest',
        prompt: i18n.language.startsWith('zh')
          ? '用中文指出一项有依据且可执行的改进。只有明显有帮助才建议。'
          : 'Suggest one specific, useful improvement, if there is one.',
        context: base,
        history: []
      });
      if (
        result?.intent === 'suggestion' &&
        result.message &&
        lookupAiEditor(docId) === adapter &&
        result.message !== lastDismissed.current.get(docId)
      ) {
        if (result.operations.length) adapter.validate?.(result.operations, base);
        update(docId, (entry) => ({ ...entry, proposal: { result, base, docId } }));
      }
    } catch (reason) {
      if (!(reason instanceof AiEditValidationError)) {
        update(docId, (entry) => ({ ...entry, error: messageOf(reason) }));
      }
    } finally {
      pendingRef.current = false;
      setPending(undefined);
    }
  }, [adapter, docId, i18n.language, update]);

  const enabled = !!proactive[docId];
  useEffect(() => {
    if (!open || view !== 'chat' || !adapter || !enabled || !status?.ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!pendingRef.current) void trySuggestion();
      }, 5200);
    };
    const unsubscribe = adapter.subscribe(schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [adapter, enabled, open, status?.ready, trySuggestion, view]);

  function append(id: string, entry: ChatEntry) {
    update(id, (current) => ({ ...current, messages: [...current.messages, entry].slice(-80) }));
  }

  function usesRecentResearch(prompt: string) {
    const text = prompt.trim();
    return !!latestResearch && (chineseResearchSave.test(text) || englishResearchSave.test(text));
  }

  async function writeResearch(entry: ChatEntry, target: AiEditorAdapter) {
    const research = entry.research;
    if (target.kind !== 'note' || !research?.posts.length || activeDoc.current !== target.docId)
      return false;
    const updateEntry = (edit: Pick<ChatEntry, 'edit' | 'researchSaveUnconfirmed'>) => {
      update(target.docId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message === entry ? { ...message, ...edit } : message
        )
      }));
    };
    try {
      const { before, after, changedIds } = await applyAiOperations(
        target,
        [
          researchNoteOperation(research.query, research.posts, {
            reddit: strings.researchReddit,
            x: strings.researchX
          })
        ],
        target.context(),
        (strings.researchSources + ' · ' + research.query).slice(0, 120),
        () => activeDoc.current === target.docId
      );
      updateEntry({ edit: { before: before.id, after: after.id, changedIds } });
      return true;
    } catch (reason) {
      if (reason instanceof AppliedSaveError) updateEntry({ researchSaveUnconfirmed: true });
      throw reason;
    }
  }

  async function saveResearchFromChat(entry: ChatEntry) {
    if (!adapter || pendingRef.current) return;
    pendingRef.current = true;
    setPending('write');
    update(docId, (conversation) => ({ ...conversation, error: undefined }));
    try {
      await writeResearch(entry, adapter);
    } catch (reason) {
      update(docId, (conversation) => ({
        ...conversation,
        error: reason instanceof AppliedSaveError ? strings.persistError : messageOf(reason)
      }));
    } finally {
      pendingRef.current = false;
      setPending(undefined);
    }
  }

  const canSend = !!draft.trim() && (!!status?.ready || usesRecentResearch(draft));

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!adapter || !text || pendingRef.current) return;
    const previous = usesRecentResearch(text) ? latestResearch : undefined;
    if (!status?.ready && !previous) return;
    const base = adapter.context();
    const history = conversation.messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content: content.slice(0, 1200) }));
    pendingRef.current = true;
    followChat.current = true;
    setPending(previous ? 'write' : 'chat');
    setDraft('');
    update(docId, (entry) => ({ ...entry, error: undefined }));
    append(docId, { role: 'user', content: text });
    let receiving = true;
    const finishStreaming = () => {
      if (!receiving) return;
      receiving = false;
      setStreamingReply(undefined);
    };
    try {
      if (previous) {
        if (adapter.kind !== 'note') {
          append(docId, { role: 'assistant', content: strings.researchNote });
        } else if ((previous.edit && !previous.edit.restored) || previous.researchSaveUnconfirmed) {
          append(docId, { role: 'assistant', content: strings.researchSaved });
        } else if (await writeResearch(previous, adapter)) {
          append(docId, { role: 'assistant', content: strings.applied });
        }
        return;
      }
      const result = await window.revezoneAi?.request(
        { mode: 'chat', prompt: text, context: base, history, previousResearchQuery },
        (message) => {
          if (receiving) setStreamingReply({ docId, message });
        }
      );
      finishStreaming();
      if (!result) throw new Error(strings.offline);
      if (result.research) {
        const reply: ChatEntry = {
          role: 'assistant',
          content: result.message,
          research: result.research
        };
        append(docId, reply);
        if (result.research.saveToNote && adapter.kind === 'note') {
          await writeResearch(reply, adapter);
        }
      } else if (result.intent === 'edit') {
        update(docId, (entry) => ({ ...entry, proposal: undefined }));
        const summary =
          result.message &&
          !result.operations.some((operation) => operation.type === result.message)
            ? result.message
            : text;
        const { before, after, changedIds } = await applyAiOperations(
          adapter,
          result.operations,
          base,
          summary.slice(0, 120),
          () => activeDoc.current === docId
        );
        append(docId, {
          role: 'assistant',
          content: summary,
          edit: { before: before.id, after: after.id, changedIds }
        });
      } else if (result.intent === 'suggestion' && result.operations.length) {
        adapter.validate?.(result.operations, base);
        const proposal = { result, base, docId };
        update(docId, (entry) => ({ ...entry, proposal }));
      } else {
        append(docId, { role: 'assistant', content: result.message });
      }
    } catch (reason) {
      update(docId, (entry) => ({
        ...entry,
        proposal: reason instanceof AiEditValidationError ? undefined : entry.proposal,
        error: editError(reason, strings, adapter.kind)
      }));
    } finally {
      finishStreaming();
      pendingRef.current = false;
      setPending(undefined);
    }
  }

  async function accept(proposal: Proposal) {
    if (!adapter || proposal.docId !== adapter.docId || pendingRef.current) return;
    pendingRef.current = true;
    setPending('write');
    update(docId, (entry) => ({ ...entry, error: undefined }));
    try {
      const { before, after, changedIds } = await applyAiOperations(
        adapter,
        proposal.result.operations,
        proposal.base,
        proposal.result.message.slice(0, 120),
        () => activeDoc.current === proposal.docId
      );
      update(docId, (entry) => ({ ...entry, proposal: undefined }));
      append(docId, {
        role: 'assistant',
        content: proposal.result.message,
        edit: { before: before.id, after: after.id, changedIds }
      });
    } catch (reason) {
      update(docId, (entry) => ({
        ...entry,
        proposal:
          reason instanceof AppliedSaveError || reason instanceof AiEditValidationError
            ? undefined
            : entry.proposal,
        error: editError(reason, strings, adapter.kind)
      }));
    } finally {
      pendingRef.current = false;
      setPending(undefined);
    }
  }

  async function undo(edit: NonNullable<ChatEntry['edit']>) {
    if (!adapter || pendingRef.current) return;
    pendingRef.current = true;
    setPending('write');
    try {
      await restoreAiVersion(adapter, edit.before, edit.after);
      update(docId, (entry) => ({
        ...entry,
        error: undefined,
        messages: entry.messages.map((message) =>
          message.edit === edit ? { ...message, edit: { ...edit, restored: true } } : message
        )
      }));
    } catch (reason) {
      update(docId, (entry) => ({
        ...entry,
        error: reason instanceof AppliedSaveError ? strings.persistError : messageOf(reason)
      }));
    } finally {
      pendingRef.current = false;
      setPending(undefined);
    }
  }

  async function createCopy(version: VersionRecord) {
    if (!tabModel || !file || version.kind !== file.type) return;
    const copy = await addFile(
      file.name + ' (' + strings.copySuffix + ')',
      version.kind,
      tabModel,
      'root'
    );
    if (!copy) throw new Error(strings.historyError);
    const target = await waitForEditor(copy.id);
    if (target.kind !== version.kind) throw new Error(strings.historyError);
    await target.restore(version.snapshot);
    await saveManualVersion(target, strings.copy);
  }

  if (!window.versionHistory || !window.revezoneAi) return <>{children}</>;

  const proposal = conversation.proposal;
  return (
    <div
      className="rz-ai-workspace"
      ref={sidebarSize.workspace}
      data-resizing={sidebarSize.dragging || undefined}
      data-ai-collapsed={!open || undefined}
    >
      <div className="rz-ai-editor">{children}</div>
      {!open && (
        <button
          className="rz-ai-open"
          ref={expandButton}
          type="button"
          onClick={() => setSidebarOpen(true)}
          title={strings.show}
          aria-label={strings.show}
          aria-controls="rz-ai-sidebar"
          aria-expanded={false}
        >
          <PanelRightOpen size={19} />
        </button>
      )}
      <aside
        id="rz-ai-sidebar"
        className="rz-ai-sidebar"
        data-overlay={sidebarSize.overlay || undefined}
        style={{ width: sidebarSize.width }}
        hidden={!open}
        aria-label={strings.title}
        data-testid="ai-sidebar"
      >
        <div
          className="rz-ai-resize"
          data-testid="ai-resize-handle"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-controls="rz-ai-sidebar"
          aria-label={strings.resize}
          title={strings.resizeHint}
          {...sidebarSize.handle}
        >
          <GripVertical size={14} aria-hidden="true" />
        </div>
        <header className="rz-ai-header">
          <div className="rz-ai-heading">
            <Sparkles size={18} aria-hidden="true" />
            <strong>{strings.title}</strong>
            {window.revezoneModel && (
              <button
                type="button"
                className="rz-ai-icon"
                title={modelStrings.open}
                aria-label={modelStrings.open}
                disabled={!!pending || switchingBackend}
                onClick={() => emitter.emit(events.OPEN_AGENT_MODEL_SETTINGS)}
              >
                <Settings size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="rz-ai-icon"
              ref={collapseButton}
              onClick={() => setSidebarOpen(false)}
              title={strings.hide}
              aria-label={strings.hide}
              aria-controls="rz-ai-sidebar"
              aria-expanded={true}
            >
              <PanelRightClose size={17} />
            </button>
          </div>
          <div
            className="rz-ai-document"
            data-active={!!docId || undefined}
            title={documentName}
            aria-label={strings.context}
          >
            <FileText size={14} aria-hidden="true" />
            <span>{docId ? documentName : strings.context}</span>
          </div>
        </header>
        <div className="rz-ai-tabs" role="tablist" aria-label={strings.title}>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'chat'}
            data-testid="ai-chat-tab"
            onClick={() => setView('chat')}
          >
            {strings.chat}
          </button>
          {window.communitySearch && (
            <button
              type="button"
              role="tab"
              aria-selected={view === 'community'}
              data-testid="ai-community-tab"
              onClick={() => setView('community')}
            >
              <Search size={15} aria-hidden="true" /> {communityTabLabel(i18n.language)}
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={view === 'history'}
            data-testid="ai-history-tab"
            onClick={() => setView('history')}
          >
            <Clock3 size={15} aria-hidden="true" /> {strings.history}
          </button>
        </div>
        {window.communitySearch && (
          <CommunityPanel
            active={view === 'community'}
            adapter={adapter}
            language={i18n.language}
            noteName={file?.type === 'note' ? documentName : undefined}
          />
        )}
        {view === 'community' ? null : !adapter ? (
          <div className="rz-ai-content">
            <p className="rz-ai-muted">{docId ? strings.starting : strings.choose}</p>
          </div>
        ) : view === 'history' ? (
          <HistoryPanel
            key={docId}
            adapter={adapter}
            strings={strings}
            createCopy={tabModel ? createCopy : undefined}
          />
        ) : (
          <>
            <div
              ref={chatContent}
              className="rz-ai-content"
              aria-live="polite"
              onScroll={({ currentTarget: content }) => {
                followChat.current =
                  content.scrollHeight - content.scrollTop - content.clientHeight < 32;
              }}
            >
              {conversation.messages.length === 0 && (
                <div className="rz-ai-intro">
                  <p>{strings.intro}</p>
                  <button
                    type="button"
                    className="rz-ai-example"
                    onClick={() => {
                      setDraft(
                        adapter.kind === 'note' ? strings.noteExample : strings.boardExample
                      );
                      composer.current?.focus();
                    }}
                  >
                    {adapter.kind === 'note' ? strings.noteExample : strings.boardExample}
                  </button>
                  <button
                    type="button"
                    className="rz-ai-example"
                    onClick={() => {
                      setDraft(strings.researchExample);
                      composer.current?.focus();
                    }}
                  >
                    {strings.researchExample}
                  </button>
                </div>
              )}
              {conversation.messages.map((entry, index) => (
                <div
                  key={index}
                  className={'rz-ai-message ' + entry.role}
                  data-testid={'ai-message-' + entry.role}
                >
                  {entry.research ? (
                    <ResearchAnswer message={entry.content} posts={entry.research.posts} />
                  ) : (
                    <div>{entry.content}</div>
                  )}
                  {entry.research && (
                    <ResearchSources
                      research={entry.research}
                      strings={strings}
                      language={i18n.language}
                      busy={!!pending}
                      save={
                        adapter.kind === 'note' &&
                        entry.research.posts.length > 0 &&
                        (!entry.edit || entry.edit.restored) &&
                        !entry.researchSaveUnconfirmed
                          ? () => void saveResearchFromChat(entry)
                          : undefined
                      }
                    />
                  )}
                  {entry.research?.saveToNote && adapter.kind !== 'note' && (
                    <p className="rz-ai-muted">{strings.researchNote}</p>
                  )}
                  {entry.edit && (
                    <div className="rz-ai-receipt" data-testid="ai-saved">
                      <span>{entry.edit.restored ? strings.restored : strings.applied}</span>
                      <div className="rz-ai-actions">
                        {!entry.edit.restored &&
                          adapter.locate &&
                          entry.edit.changedIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => adapter.locate?.(entry.edit!.changedIds)}
                            >
                              {strings.locate}
                            </button>
                          )}
                        {!entry.edit.restored && (
                          <button
                            type="button"
                            disabled={!!pending}
                            onClick={() => void undo(entry.edit!)}
                          >
                            {strings.undo}
                          </button>
                        )}
                        <button type="button" onClick={() => setView('history')}>
                          {strings.viewHistory}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {proposal && (
                <section className="rz-ai-proposal" data-testid="ai-proposal">
                  <strong>{strings.proposal}</strong>
                  <p>{proposal.result.message}</p>
                  <div className="rz-ai-actions">
                    {proposal.result.operations.length > 0 && (
                      <button
                        type="button"
                        data-testid="ai-apply-proposal"
                        disabled={!!pending}
                        onClick={() => void accept(proposal)}
                      >
                        {strings.apply}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        lastDismissed.current.set(docId, proposal.result.message);
                        update(docId, (entry) => ({ ...entry, proposal: undefined }));
                      }}
                    >
                      {strings.ignore}
                    </button>
                  </div>
                </section>
              )}
              {preview && (
                <div
                  className="rz-ai-message assistant"
                  data-testid="ai-streaming-message"
                  aria-hidden="true"
                >
                  {preview}
                </div>
              )}
              {pending && (
                <p className="rz-ai-muted" role="status">
                  {pending === 'suggest'
                    ? strings.thinking
                    : pending === 'write'
                    ? strings.restoring
                    : strings.working}
                </p>
              )}
              {conversation.error && (
                <p className="rz-ai-error" role="alert">
                  {conversation.error}
                </p>
              )}
            </div>
            <form
              className="rz-ai-compose"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              {!status?.ready && (
                <div className="rz-ai-connection">
                  <strong>{status ? strings.offline : strings.waiting}</strong>
                  {status && (
                    <>
                      <p>{window.revezoneModel ? modelStrings.offline : strings.localSetup}</p>
                      <div className="rz-ai-actions">
                        {window.revezoneModel && (
                          <button
                            type="button"
                            disabled={switchingBackend}
                            onClick={() => emitter.emit(events.OPEN_AGENT_MODEL_SETTINGS)}
                          >
                            {modelStrings.open}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={switchingBackend}
                          onClick={() => void refreshStatus()}
                        >
                          {strings.check}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {status?.ready && !status.local && <p className="rz-ai-muted">{strings.remote}</p>}
              <div className="rz-ai-compose-box">
                <textarea
                  ref={composer}
                  rows={3}
                  maxLength={4000}
                  value={draft}
                  data-testid="ai-composer"
                  aria-label={strings.placeholder}
                  placeholder={strings.placeholder}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                />
                <button
                  className="rz-ai-primary"
                  type="submit"
                  data-testid="ai-send"
                  title={strings.send}
                  aria-label={strings.send}
                  disabled={!canSend || !!pending || switchingBackend}
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="rz-ai-compose-meta">
                <label>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!status?.ready || switchingBackend}
                    data-testid="ai-proactive"
                    onChange={(event) =>
                      setProactive({ ...proactive, [docId]: event.target.checked })
                    }
                  />
                  {strings.proactive}
                </label>
                {backend ? (
                  <select
                    className="rz-ai-backend-select"
                    data-testid="ai-backend-select"
                    aria-label={modelStrings.backend}
                    aria-busy={switchingBackend}
                    title={status?.model || modelStrings.backend}
                    value={backend}
                    disabled={!!pending || switchingBackend}
                    onChange={(event) => void switchBackend(event.target.value as ModelBackend)}
                  >
                    <option value="builtin">{strings.defaultBackend}</option>
                    <option value="claude">Claude Code</option>
                    <option value="codex">Codex</option>
                  </select>
                ) : (
                  status?.ready && <span title={status.model}>{status.model}</span>
                )}
              </div>
              {backendError && (
                <p className="rz-ai-error" role="alert">
                  {backendError}
                </p>
              )}
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
