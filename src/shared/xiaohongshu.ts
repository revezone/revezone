const SITE = 'https://www.xiaohongshu.com';
const notePath = /^\/(?:explore|discovery\/item|search_result)\/[a-f\d]{24}\/?$/i;
const shortPath = /^\/(?:[a-z]\/[a-z\d_-]{3,80}|[a-z\d_-]{4,80})\/?$/i;

export function normalizeXiaohongshuPostUrl(input: string): string | undefined {
  if (input.length > 2048 || /[\s\p{Cc}\\]/u.test(input)) return;
  try {
    const url = new URL(input);
    if (
      !/^https?:\/\//i.test(input) ||
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.username ||
      url.password ||
      url.port
    )
      return;
    const isNote =
      ['www.xiaohongshu.com', 'xiaohongshu.com'].includes(url.hostname) &&
      notePath.test(url.pathname);
    const isShare =
      ['xhslink.com', 'www.xhslink.com'].includes(url.hostname) && shortPath.test(url.pathname);
    if (!isNote && !isShare) return;
    url.protocol = 'https:';
    return url.href;
  } catch {
    return undefined;
  }
}

export function xiaohongshuSearchUrl(keyword: string) {
  const term = keyword.trim();
  const url = new URL(term ? '/search_result' : '/explore', SITE);
  if (term) url.searchParams.set('keyword', term);
  return url.href;
}

export function isXiaohongshuCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
