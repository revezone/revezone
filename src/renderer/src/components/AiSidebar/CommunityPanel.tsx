import { useState } from 'react';
import { ArrowUpRight, FilePlus, Search } from 'lucide-react';
import type {
  CommunityPost,
  CommunityQuery,
  CommunitySearchResponse,
  CommunitySource
} from '../../../../shared/community';
import type { AiEditorAdapter } from '@renderer/ai/editorRegistry';
import { AppliedSaveError, applyAiOperations } from '@renderer/ai/editorRegistry';
import { researchNoteOperation } from '@renderer/ai/communityResearch';
import XiaohongshuCapture from './XiaohongshuCapture';
import './community.css';

const platforms: Record<CommunitySource, string> = { github: 'GitHub', reddit: 'Reddit', x: 'X' };
const sources = Object.keys(platforms) as CommunitySource[];
const maxSelection = 10;

const english = {
  tab: 'Community',
  placeholder: 'Search public posts…',
  search: 'Search',
  scope: 'Sources',
  sort: 'Sort',
  relevance: 'Relevant',
  recent: 'Newest',
  start: 'Search public GitHub issues and pull requests, Reddit posts, or recent posts on X.',
  searching: 'Searching…',
  empty: 'No posts matched. Try a shorter query or another source.',
  failed: 'Search failed. Try again.',
  import: 'Add to current note',
  openNote: 'Open a note to save these results.',
  saved: 'Added selected sources to the note.',
  importFailed: 'The sources could not be saved. Try again.',
  redditSetup: 'Reddit requires approved OAuth credentials and a descriptive User-Agent.',
  xSetup: 'Set REVEZONE_X_BEARER_TOKEN to search using the official X API.',
  xWindow: 'X · Last 7 days',
  xUsage: 'Searching X may use API credits.',
  saveUnconfirmed:
    'The note changed, but the save could not be confirmed. Check its version history.',
  adding: 'Adding…',
  original: 'Open original',
  redditReference: 'Open Reddit post',
  xReference: 'Open X post',
  selected: (count: number) => count + ' selected',
  results: (count: number) => count + ' results',
  select: (title: string) => 'Select ' + title
};

const chinese: typeof english = {
  tab: '社区检索',
  placeholder: '搜索公开帖子…',
  search: '搜索',
  scope: '来源',
  sort: '排序',
  relevance: '按相关度',
  recent: '按发布时间',
  start: '检索 GitHub 公开 Issue、PR，或 Reddit 和 X 的公开帖子。',
  searching: '正在检索…',
  empty: '没有匹配的帖子。试试缩短关键词，或切换来源。',
  failed: '搜索失败，请重试。',
  import: '整理进当前笔记',
  openNote: '打开一篇笔记即可保存这些结果。',
  saved: '已将选中的来源整理进笔记。',
  importFailed: '保存检索结果失败，请重试。',
  redditSetup: '需要配置已获批准的 Reddit OAuth 凭据和 User-Agent。',
  xSetup: '配置 REVEZONE_X_BEARER_TOKEN 后即可使用 X 官方检索。',
  xWindow: 'X · 近 7 天',
  xUsage: '搜索 X 可能消耗 API 额度。',
  saveUnconfirmed: '笔记已更新，但保存未能确认。请查看笔记的版本历史。',
  adding: '正在整理…',
  original: '打开原帖',
  redditReference: '打开 Reddit 原帖',
  xReference: '打开 X 原帖',
  selected: (count) => '已选 ' + count + ' 条',
  results: (count) => '找到 ' + count + ' 条结果',
  select: (title) => '选中 ' + title
};

export const communityTabLabel = (language: string) =>
  (language.startsWith('zh') ? chinese : english).tab;
const postKey = (post: CommunityPost) => post.source + ':' + post.id;

export default function CommunityPanel({
  active,
  language,
  adapter,
  noteName
}: {
  active: boolean;
  language: string;
  adapter?: AiEditorAdapter;
  noteName?: string;
}) {
  const copy = language.startsWith('zh') ? chinese : english;
  const [query, setQuery] = useState('');
  const [enabled, setEnabled] = useState<CommunitySource[]>(['github']);
  const [sort, setSort] = useState<CommunityQuery['sort']>('relevance');
  const [response, setResponse] = useState<CommunitySearchResponse>();
  const [completedQuery, setCompletedQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [noteStatus, setNoteStatus] = useState<{ text: string; error?: boolean }>();
  const target = adapter?.kind === 'note' ? adapter : undefined;
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });

  async function search() {
    const term = query.trim();
    if (!window.communitySearch || !term || enabled.length === 0 || searching || adding) return;
    setSearching(true);
    setSearchError('');
    setResponse(undefined);
    setSelected(new Set());
    setNoteStatus(undefined);
    try {
      const result = await window.communitySearch.search({ query: term, sources: enabled, sort });
      setCompletedQuery(term);
      setResponse(result);
      setSelected(new Set(result.posts.slice(0, 5).map(postKey)));
    } catch {
      setSearchError(copy.failed);
    } finally {
      setSearching(false);
    }
  }

  async function addToNote() {
    if (!target || !response || adding || selected.size === 0) return;
    const results = response.posts.filter((post) => selected.has(postKey(post)));
    if (!results.length) return;
    setAdding(true);
    setNoteStatus(undefined);
    try {
      await applyAiOperations(
        target,
        [
          researchNoteOperation(completedQuery, results, {
            reddit: copy.redditReference,
            x: copy.xReference
          })
        ],
        target.context(),
        (copy.tab + ' · ' + completedQuery).slice(0, 120)
      );
      setSelected(new Set());
      setNoteStatus({ text: copy.saved });
    } catch (error) {
      if (error instanceof AppliedSaveError) {
        setSelected(new Set());
        setNoteStatus({ text: copy.saveUnconfirmed, error: true });
      } else {
        setNoteStatus({ text: copy.importFailed, error: true });
      }
    } finally {
      setAdding(false);
    }
  }

  function toggle(post: CommunityPost) {
    setSelected((previous) => {
      const next = new Set(previous);
      const key = postKey(post);
      if (next.has(key)) next.delete(key);
      else if (next.size < maxSelection) next.add(key);
      return next;
    });
  }

  return (
    <section
      className="rz-community"
      hidden={!active}
      role="tabpanel"
      aria-label={copy.tab}
      data-testid="community-panel"
    >
      <form
        className="rz-community-search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <div className="rz-community-query">
          <input
            value={query}
            maxLength={160}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={copy.placeholder}
            placeholder={copy.placeholder}
            data-testid="community-query"
          />
          <button
            type="submit"
            className="rz-ai-primary"
            disabled={!query.trim() || !enabled.length || searching || adding}
            data-testid="community-submit"
          >
            <Search size={14} aria-hidden="true" />
            {copy.search}
          </button>
        </div>
        <div className="rz-community-filters">
          <fieldset aria-label={copy.scope}>
            {sources.map((source) => (
              <label key={source}>
                <input
                  type="checkbox"
                  checked={enabled.includes(source)}
                  data-testid={'community-source-' + source}
                  disabled={searching || adding}
                  onChange={() =>
                    setEnabled((previous) =>
                      previous.includes(source)
                        ? previous.filter((item) => item !== source)
                        : [...previous, source]
                    )
                  }
                />
                {source === 'x' ? copy.xWindow : platforms[source]}
              </label>
            ))}
          </fieldset>
          <select
            value={sort}
            aria-label={copy.sort}
            disabled={searching || adding}
            onChange={(event) => setSort(event.target.value === 'recent' ? 'recent' : 'relevance')}
          >
            <option value="relevance">{copy.relevance}</option>
            <option value="recent">{copy.recent}</option>
          </select>
        </div>
        {enabled.includes('x') && <p className="rz-community-usage rz-ai-muted">{copy.xUsage}</p>}
      </form>
      <div className="rz-ai-content rz-community-content" aria-live="polite" aria-busy={searching}>
        <XiaohongshuCapture query={query} language={language} target={target} />
        {searching && (
          <p className="rz-ai-muted" role="status">
            {copy.searching}
          </p>
        )}
        {searchError && (
          <p className="rz-ai-error" role="alert">
            {searchError}
          </p>
        )}
        {!searching && !response && !searchError && <p className="rz-ai-muted">{copy.start}</p>}
        {response && (
          <>
            {sources.map(
              (source) =>
                response.errors[source] && (
                  <p className="rz-ai-error" key={source} data-testid={'community-error-' + source}>
                    <strong>{platforms[source]}</strong> ·{' '}
                    {source === 'x' && response.errors[source]?.includes('REVEZONE_X_BEARER_TOKEN')
                      ? copy.xSetup
                      : source === 'reddit' &&
                        response.errors[source]?.includes('requires approved OAuth')
                      ? copy.redditSetup
                      : response.errors[source]}
                  </p>
                )
            )}
            {response.posts.length ? (
              <>
                <p className="rz-ai-muted rz-community-count">
                  {copy.results(response.posts.length)} · {completedQuery}
                </p>
                <ul className="rz-community-results">
                  {response.posts.map((post) => {
                    const checked = selected.has(postKey(post));
                    return (
                      <li key={postKey(post)} data-testid="community-post">
                        <input
                          type="checkbox"
                          aria-label={copy.select(post.title)}
                          checked={checked}
                          disabled={adding || (!checked && selected.size >= maxSelection)}
                          onChange={() => toggle(post)}
                        />
                        <div>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={copy.original + ' · ' + post.url}
                          >
                            {post.title} <ArrowUpRight size={13} aria-hidden="true" />
                          </a>
                          <div className="rz-community-byline">
                            <span>
                              {platforms[post.source]}
                              {post.community ? ' · ' + post.community : ''}
                            </span>
                            <time dateTime={post.publishedAt}>
                              {date.format(new Date(post.publishedAt))}
                            </time>
                          </div>
                          {post.excerpt && <p className="rz-community-excerpt">{post.excerpt}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              !Object.keys(response.errors).length && <p className="rz-ai-muted">{copy.empty}</p>
            )}
          </>
        )}
      </div>
      <footer className="rz-community-footer">
        {noteStatus && (
          <p
            role={noteStatus.error ? 'alert' : 'status'}
            className={noteStatus.error ? 'rz-ai-error' : 'rz-ai-success'}
            data-testid="community-note-status"
          >
            {noteStatus.text}
          </p>
        )}
        {response?.posts.length ? (
          <>
            <p className="rz-ai-muted">
              {target ? noteName || copy.selected(selected.size) : copy.openNote}
            </p>
            <button
              type="button"
              className="rz-ai-primary"
              disabled={!target || !selected.size || adding || searching}
              onClick={() => void addToNote()}
              data-testid="community-import"
            >
              <FilePlus size={15} aria-hidden="true" />
              {adding ? copy.adding : copy.import}
              {selected.size > 0 && (
                <span className="rz-community-selection">{copy.selected(selected.size)}</span>
              )}
            </button>
          </>
        ) : null}
      </footer>
    </section>
  );
}
