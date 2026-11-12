import { COMMUNITY_SOURCES } from '../../shared/community';
import type {
  CommunityPost,
  CommunityQuery,
  CommunitySearchResponse,
  CommunitySource
} from '../../shared/community';

const SOURCE_LIMIT = 10;
const SEARCH_TIMEOUT = 8000;
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  'User-Agent': 'Revezone community search'
};

class ProviderError extends Error {}

const PROVIDER_NAMES = { github: 'GitHub', reddit: 'Reddit', x: 'X' } as const;
type ProviderName = (typeof PROVIDER_NAMES)[CommunitySource];
const retryAt: Partial<Record<ProviderName, number>> = {};
let cachedRedditToken: { clientId: string; token: string; expiresAt: number } | undefined;

function object(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readQuery(input: unknown): CommunityQuery {
  const value = object(input);
  const query = typeof value?.query === 'string' ? value.query.trim().replace(/\s+/gu, ' ') : '';
  if (!query || query.length > 160 || !/[\p{L}\p{N}]/u.test(query) || /\p{Cc}/u.test(query)) {
    throw new Error('Enter a search phrase of up to 160 characters.');
  }
  const { sources, sort } = value ?? {};
  if (
    !Array.isArray(sources) ||
    sources.length < 1 ||
    sources.length > COMMUNITY_SOURCES.length ||
    sources.some((source) => !COMMUNITY_SOURCES.some((supported) => source === supported)) ||
    (sort !== 'relevance' && sort !== 'recent')
  ) {
    throw new Error('Choose at least one supported search source and a sort order.');
  }
  return { query, sources: [...new Set<CommunitySource>(sources)], sort };
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/gu, ' ').trim();
  if (clean.length <= max) return clean || undefined;
  return clean.slice(0, max - 1).trimEnd() + '…';
}

function isoDate(value: unknown): string | undefined {
  const timestamp =
    typeof value === 'number'
      ? value * 1000
      : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
      ? Date.parse(value)
      : NaN;
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > 8.64e15) return undefined;
  return new Date(timestamp).toISOString();
}

async function requestJson(url: URL, init: RequestInit, provider: ProviderName): Promise<unknown> {
  if ((retryAt[provider] ?? 0) > Date.now()) {
    throw new ProviderError(`${provider} search rate limit reached. Try again later.`);
  }
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(SEARCH_TIMEOUT)
  });
  if (!response.ok) {
    // Provider response bodies may include arbitrary text. Keep credentials and raw errors in main.
    await response.body?.cancel().catch(() => undefined);
    const rateHeaderPrefix = provider === 'X' ? 'x-rate-limit-' : 'x-ratelimit-';
    const rateLimited =
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.get(rateHeaderPrefix + 'remaining') === '0' ||
          response.headers.has('retry-after')));
    if (rateLimited) {
      const now = Date.now();
      const retry = response.headers.get('retry-after');
      const reset = response.headers.get(rateHeaderPrefix + 'reset');
      const retryTime =
        retry && (/^\d+$/.test(retry) ? now + Number(retry) * 1000 : Date.parse(retry));
      const resetTime =
        reset && (provider === 'Reddit' ? now + Number(reset) * 1000 : Number(reset) * 1000);
      retryAt[provider] = Math.max(
        now + 1000,
        Number(retryTime) || Number(resetTime) || now + 60_000
      );
      throw new ProviderError(`${provider} search rate limit reached. Try again later.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(
        `${provider} denied access. Check the configured credentials and permissions.`
      );
    }
    if (provider === 'X' && response.status === 402) {
      throw new ProviderError(
        'X search needs available API credits. Check the X Developer Console.'
      );
    }
    if (provider === 'X' && response.status === 400) {
      throw new ProviderError('X could not process this search phrase. Try plain keywords.');
    }
    if (response.status === 422)
      throw new ProviderError(`${provider} could not process this search phrase.`);
    throw new ProviderError(`${provider} search is unavailable (HTTP ${response.status}).`);
  }
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new ProviderError(`${provider} did not return usable search data.`);
    throw error;
  }
}

function githubPost(value: unknown): CommunityPost | undefined {
  const item = object(value);
  if (!item || typeof item.html_url !== 'string') return undefined;
  let link: URL;
  try {
    link = new URL(item.html_url);
  } catch {
    return undefined;
  }
  if (link.origin !== 'https://github.com' || link.username || link.password) return undefined;
  const discussion = /^\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/(issues|pull)\/(\d+)\/?$/.exec(
    link.pathname
  );
  const title = text(item.title, 300);
  const publishedAt = typeof item.created_at === 'string' ? isoDate(item.created_at) : undefined;
  if (!discussion || !title || !publishedAt) return undefined;
  const [, community, kind, number] = discussion;
  if ((kind === 'pull') !== !!object(item.pull_request)) return undefined;
  return {
    id: `github:${community.toLowerCase()}/${kind}/${number}`,
    source: 'github',
    title,
    url: `https://github.com/${community}/${kind}/${number}`,
    publishedAt,
    excerpt: text(item.body, 360),
    community
  };
}

function githubQuery(query: string): string {
  const words = query.split(' ');
  const scopes = words.filter((word) => /^repo:/i.test(word));
  const repo = /^repo:([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9_.-]{1,100})$/i.exec(scopes[0] ?? '');
  if (
    scopes.length &&
    (scopes.length !== 1 || !repo || repo[1].length > 39 || repo[2] === '.' || repo[2] === '..')
  ) {
    throw new ProviderError(
      'Use one repo:owner/name to restrict GitHub search to a public repository.'
    );
  }
  // Only the checked repository qualifier and fixed visibility are interpreted by GitHub.
  const terms =
    words
      .filter((word) => !/^repo:/i.test(word))
      .join(' ')
      .match(/[\p{L}\p{N}][\p{L}\p{N}._+/-]*/gu)
      ?.slice(0, 20) ?? [];
  return [
    ...terms.map((word) => `"${word}"`),
    ...(repo ? [`repo:${repo[1]}/${repo[2]}`] : []),
    'is:public'
  ].join(' ');
}

async function searchGithub({ query, sort }: CommunityQuery): Promise<CommunityPost[]> {
  const url = new URL('https://api.github.com/search/issues');
  url.searchParams.set('q', githubQuery(query));
  url.searchParams.set('per_page', String(SOURCE_LIMIT));
  if (sort === 'recent') {
    url.searchParams.set('sort', 'created');
    url.searchParams.set('order', 'desc');
  }
  const token = process.env.REVEZONE_GITHUB_TOKEN?.trim();
  const payload = object(
    await requestJson(
      url,
      {
        headers: { ...GITHUB_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      },
      'GitHub'
    )
  );
  const items = payload?.items;
  if (!Array.isArray(items)) throw new ProviderError('GitHub did not return a search result list.');
  return items.slice(0, SOURCE_LIMIT).flatMap((item) => githubPost(item) ?? []);
}

async function redditAccessToken(userAgent: string): Promise<string> {
  const supplied = process.env.REVEZONE_REDDIT_ACCESS_TOKEN?.trim();
  if (supplied) return supplied;

  const clientId = process.env.REVEZONE_REDDIT_CLIENT_ID?.trim();
  const secret = process.env.REVEZONE_REDDIT_CLIENT_SECRET?.trim();
  if (!clientId || !secret) {
    throw new ProviderError(
      'Reddit requires approved OAuth credentials. Configure a Reddit access token or approved application credentials.'
    );
  }
  if (cachedRedditToken?.clientId === clientId && cachedRedditToken.expiresAt > Date.now()) {
    return cachedRedditToken.token;
  }
  const payload = object(
    await requestJson(
      new URL('https://www.reddit.com/api/v1/access_token'),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
          'User-Agent': userAgent
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' })
      },
      'Reddit'
    )
  );
  const token = payload?.access_token;
  if (
    typeof token !== 'string' ||
    !token ||
    typeof payload?.token_type !== 'string' ||
    payload.token_type.toLowerCase() !== 'bearer'
  ) {
    throw new ProviderError('Reddit could not authorize the configured application.');
  }
  const expiresIn = payload?.expires_in;
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 30) {
    cachedRedditToken = {
      clientId,
      token,
      expiresAt: Date.now() + (Math.min(expiresIn, 3600) - 30) * 1000
    };
  }
  return token;
}

function redditPost(value: unknown): CommunityPost | undefined {
  const child = object(value);
  const post = object(child?.data);
  if (
    child?.kind !== 't3' ||
    !post ||
    post.subreddit_type !== 'public' ||
    post.over_18 ||
    post.quarantine ||
    post.removed_by_category ||
    post.selftext === '[deleted]' ||
    post.selftext === '[removed]' ||
    typeof post.permalink !== 'string'
  )
    return undefined;
  const path = /^\/r\/([A-Za-z0-9_]+)\/comments\/([a-z0-9]+)(?:\/[A-Za-z0-9_%-]+)?\/?$/i.exec(
    post.permalink
  );
  const title = text(post.title, 300);
  const publishedAt = typeof post.created_utc === 'number' ? isoDate(post.created_utc) : undefined;
  if (!path || !title || !publishedAt) return undefined;
  const [, subreddit, postId] = path;
  return {
    id: `reddit:${postId.toLowerCase()}`,
    source: 'reddit',
    title,
    url: `https://www.reddit.com/r/${subreddit}/comments/${postId}/`,
    publishedAt,
    excerpt: text(post.selftext, 360),
    community: `r/${subreddit}`
  };
}

async function searchReddit({ query, sort }: CommunityQuery): Promise<CommunityPost[]> {
  const userAgent = process.env.REVEZONE_REDDIT_USER_AGENT?.trim();
  if (!userAgent || !/^[\x20-\x7e]{10,200}$/.test(userAgent)) {
    throw new ProviderError(
      'Reddit requires approved OAuth credentials and a descriptive User-Agent. Set REVEZONE_REDDIT_USER_AGENT.'
    );
  }
  const token = await redditAccessToken(userAgent);
  const url = new URL('https://oauth.reddit.com/search');
  url.search = new URLSearchParams({
    q: query,
    sort: sort === 'recent' ? 'new' : 'relevance',
    type: 'link',
    limit: String(SOURCE_LIMIT),
    raw_json: '1'
  }).toString();
  const payload = object(
    await requestJson(
      url,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': userAgent
        }
      },
      'Reddit'
    )
  );
  const children = object(payload?.data)?.children;
  if (!Array.isArray(children)) throw new ProviderError('Reddit did not return a post list.');
  return children.slice(0, SOURCE_LIMIT).flatMap((item) => redditPost(item) ?? []);
}

function xPost(
  value: unknown,
  authors: Map<string, Record<string, unknown>>
): CommunityPost | undefined {
  const post = object(value);
  if (typeof post?.id !== 'string' || !/^[0-9]{1,19}$/.test(post.id) || post.withheld)
    return undefined;
  const publishedAt = typeof post.created_at === 'string' ? isoDate(post.created_at) : undefined;
  const title = text(post.text, 120);
  if (!publishedAt || !title) return undefined;

  const author = typeof post.author_id === 'string' ? authors.get(post.author_id) : undefined;
  if (author?.protected || author?.withheld) return undefined;
  const username =
    typeof author?.username === 'string' && /^[A-Za-z0-9_]{1,15}$/.test(author.username)
      ? author.username
      : undefined;
  const excerpt = text(post.text, 360);
  return {
    id: `x:${post.id}`,
    source: 'x',
    title,
    url: `https://x.com/${username ? `${username}/status` : 'i/web/status'}/${post.id}`,
    publishedAt,
    excerpt: excerpt === title ? undefined : excerpt,
    community: username ? `@${username}` : undefined
  };
}

async function searchX({ query, sort }: CommunityQuery): Promise<CommunityPost[]> {
  const token = process.env.REVEZONE_X_BEARER_TOKEN?.trim();
  if (!token) {
    throw new ProviderError(
      'X search requires an app-only Bearer Token. Set REVEZONE_X_BEARER_TOKEN.'
    );
  }
  const keywords = query
    .split(' ')
    .filter((word) => !/^repo:/i.test(word))
    .join(' ');
  if (!/[\p{L}\p{N}]/u.test(keywords)) {
    throw new ProviderError('Enter keywords for X search. The repo: filter applies to GitHub.');
  }

  const url = new URL('https://api.x.com/2/tweets/search/recent');
  url.search = new URLSearchParams({
    query: keywords,
    sort_order: sort === 'recent' ? 'recency' : 'relevancy',
    max_results: String(SOURCE_LIMIT),
    'tweet.fields': 'created_at,author_id,withheld',
    expansions: 'author_id',
    'user.fields': 'username,protected,withheld'
  }).toString();
  const payload = object(
    await requestJson(
      url,
      {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      },
      'X'
    )
  );
  const items = payload?.data;
  if (!Array.isArray(items)) {
    if (items === undefined && object(payload?.meta)?.result_count === 0 && !payload?.errors)
      return [];
    throw new ProviderError('X did not return a post list.');
  }

  const authors = new Map<string, Record<string, unknown>>();
  const users = object(payload?.includes)?.users;
  if (Array.isArray(users)) {
    for (const value of users) {
      const user = object(value);
      if (user && typeof user.id === 'string') authors.set(user.id, user);
    }
  }
  return items.slice(0, SOURCE_LIMIT).flatMap((item) => xPost(item, authors) ?? []);
}

export async function searchCommunity(input: unknown): Promise<CommunitySearchResponse> {
  const query = readQuery(input);
  const errors: CommunitySearchResponse['errors'] = {};
  const providers = { github: searchGithub, reddit: searchReddit, x: searchX };
  const groups = await Promise.all(
    query.sources.map(async (source) => {
      try {
        return await providers[source](query);
      } catch (error) {
        const name = PROVIDER_NAMES[source];
        errors[source] =
          error instanceof ProviderError
            ? error.message
            : error instanceof Error && error.name === 'TimeoutError'
            ? `${name} search timed out.`
            : `${name} search could not be reached.`;
        return [];
      }
    })
  );

  // Preserve each provider's relevance order and give each source a place in the combined list.
  const posts = new Map<string, CommunityPost>();
  for (let index = 0; index < SOURCE_LIMIT; index++) {
    for (const group of groups) {
      const post = group[index];
      if (post && !posts.has(post.id)) posts.set(post.id, post);
    }
  }
  const combined = [...posts.values()];
  if (query.sort === 'recent') combined.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { posts: combined, errors };
}
