import type { CommunityPost } from '../../../shared/community';
import { normalizeXiaohongshuPostUrl } from '../../../shared/xiaohongshu';
import type { AiOperation } from './editorRegistry';

const RESEARCH_RESULT_LIMIT = 10;
const RESEARCH_HOSTS = {
  github: new Set(['github.com', 'www.github.com']),
  reddit: new Set(['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com'])
};
const RESEARCH_SOURCE_NAMES = { github: 'GitHub', reddit: 'Reddit', x: 'X', xiaohongshu: '小红书' };
type ResearchSource = keyof typeof RESEARCH_SOURCE_NAMES;
const X_POST_PATH = /^\/(?:[A-Za-z0-9_]{1,15}\/status|i\/web\/status)\/[0-9]{1,25}\/?$/;

function researchText(value: unknown, limit: number, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > limit) {
    throw new Error('The search result contains invalid text.');
  }
  const text = value.replace(/\s+/g, ' ').trim();
  if (/\p{Cc}/u.test(text)) throw new Error('The search result contains invalid text.');
  if (!text && !allowEmpty) throw new Error('The search result is missing required text.');
  return text;
}

function researchDate(value: unknown, beijingMinutesAllowed: boolean) {
  const beijingMinutes =
    beijingMinutesAllowed &&
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d\+08:00$/.test(value);
  if (
    typeof value !== 'string' ||
    (!beijingMinutes &&
      !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))
  ) {
    throw new Error('The search result is missing a valid publication date.');
  }
  const day = value.slice(0, 10);
  const calendar = new Date(day);
  const date = new Date(value);
  if (
    day.startsWith('0000-') ||
    !Number.isFinite(date.getTime()) ||
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== day
  ) {
    throw new Error('The search result is missing a valid publication date.');
  }
  if (beijingMinutes) return `${value.slice(0, 16).replace('T', ' ')} UTC+08:00`;
  return value.length === 10 ? day : `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

function isResearchSource(value: unknown): value is ResearchSource {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(RESEARCH_SOURCE_NAMES, value)
  );
}

export function trustedResearchUrl(value: unknown, source?: ResearchSource) {
  if (typeof value !== 'string') return undefined;
  if (source === 'xiaohongshu') return normalizeXiaohongshuPostUrl(value);
  if (!source) {
    const xiaohongshu = normalizeXiaohongshuPostUrl(value);
    if (xiaohongshu) return xiaohongshu;
  }
  try {
    if (
      value.length <= 2048 &&
      /^https:\/\//i.test(value) &&
      !/[\s\p{Cc}\\]/u.test(value) &&
      !value.slice(8).split(/[/?#]/, 1)[0].includes('@')
    ) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
      if ((!source || source === 'github') && RESEARCH_HOSTS.github.has(url.hostname))
        return url.href;
      if ((!source || source === 'reddit') && RESEARCH_HOSTS.reddit.has(url.hostname))
        return url.href;
      if ((!source || source === 'x') && url.hostname === 'x.com' && X_POST_PATH.test(url.pathname))
        return url.href;
    }
  } catch {
    // Invalid URLs fail with the same message as unsupported origins.
  }
  return undefined;
}

export function parseResearchParagraphs(operation: AiOperation) {
  const query = researchText(operation.query, 400);
  if (
    !Array.isArray(operation.results) ||
    operation.results.length < 1 ||
    operation.results.length > RESEARCH_RESULT_LIMIT
  ) {
    throw new Error('Choose between one and ten search results to add to the note.');
  }
  const results = operation.results.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !isResearchSource(item.source)
    ) {
      throw new Error('The search result is missing a supported source.');
    }
    const manual = item.source === 'xiaohongshu';
    const title = manual
      ? (item.title == null ? '' : researchText(item.title, 400, true)) || '查看原帖'
      : researchText(item.title, 400);
    const url = trustedResearchUrl(item.url, item.source);
    if (!url) throw new Error('The search result needs a valid HTTPS link to its source.');
    const date =
      manual && (item.publishedAt == null || item.publishedAt === '')
        ? undefined
        : researchDate(item.publishedAt, manual);
    const source = RESEARCH_SOURCE_NAMES[item.source];
    const excerpt = item.excerpt === undefined ? '' : researchText(item.excerpt, 1600, true);
    const details = ` · ${source}${date ? ` · ${date}` : ''}${excerpt ? `\n${excerpt}` : ''}`;
    return { title, url, details };
  });
  return { query, results };
}

export function researchNoteOperation(
  query: string,
  posts: CommunityPost[],
  linkTitles: { reddit: string; x: string }
): AiOperation {
  return {
    type: 'appendResearch',
    query,
    results: posts.slice(0, 10).map((post) => ({
      source: post.source,
      title: post.source === 'github' ? post.title : linkTitles[post.source],
      url: post.url,
      publishedAt: post.publishedAt
    }))
  };
}
