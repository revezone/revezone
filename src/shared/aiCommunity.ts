import type { CommunitySource } from './community';

const NAME = String.raw`(?:(?<![a-z0-9_])(?:GitHub|Reddit|X\s*[(（]\s*Twitter\s*[)）]|Twitter|X|Xiaohongshu|REDnote)(?![a-z0-9_])|小红书)`;
const SEQUENCE = String.raw`${NAME}(?:\s*(?:and\b|or\b|[&+,，、/]|以及|和|与|及|或)\s*${NAME})*`;
const SEARCH_CN = String.raw`(?:搜索|搜(?:一下|下|一搜)?|检索|查询|查找|查(?:一下|一查|下)?|找(?:一下|一找|找)?|调研(?:一下)?|研究(?:一下)?|看看|看一下)`;
const SEARCH_EN = String.raw`(?:search|research|look\s+up|browse|investigate|check|find)`;
const REQUEST_PREFIX = String.raw`(?:(?:请(?:你|帮我)?|帮我|能否|能不能|可以|可不可以|先|我想(?:请你)?|please|(?:can|could|would) you|help me)\s*[：:,，]*)*`;
const COMMAND = new RegExp(String.raw`${SEARCH_CN}|\b${SEARCH_EN}\b`, 'i');
const LEADING_COMMAND = new RegExp(
  String.raw`^\s*${REQUEST_PREFIX}(?:上网\s*|网上\s*|在线\s*)?(?:(?!搜索(?:功能|结果|按钮|排序|算法)|调研(?:报告|结果|方法))${SEARCH_CN}|${SEARCH_EN}\b)`,
  'i'
);
const QUOTED_EDIT = new RegExp(
  String.raw`^\s*${REQUEST_PREFIX}(?:追加|添加|新增|写入|替换|改写|改成|插入|记录|翻译|append\b|add\b|write\b|replace\b|insert\b|translate\b).{0,30}[：:"“「]`,
  'i'
);
const LEADING_LOCAL_TARGET = new RegExp(
  String.raw`^\s*${REQUEST_PREFIX}(?:${SEARCH_CN}\s*(?:(?:我的|当前|这份|这篇|本页|本篇|此处|所选)\s*(?:笔记|文档|画板|白板|选区|原文)|(?:笔记|文档|画板|白板|原文)\s*(?:中|里|内|$))|${SEARCH_EN}\s+(?:my|this|the current)\s+(?:notes?|document|board|canvas|selection)\b)`,
  'i'
);
const SITE_PHRASES = [
  new RegExp(
    String.raw`(?:在|从|去|到)\s*(${SEQUENCE})\s*(?:上|里|中|平台)?(?=\s*(?:${SEARCH_CN}|关于|有关|的(?:帖子|讨论)|[：:，。!?？]|$))`,
    'gi'
  ),
  new RegExp(
    String.raw`(${SEQUENCE})\s*(?:上(?:面)?的?|里(?:的)?|平台(?:的)?|的(?:帖子|讨论|社区))`,
    'gi'
  ),
  new RegExp(
    String.raw`\b(?:on|across|from|via|using)\s+(?:both\s+)?(${SEQUENCE})(?=\s*(?:\b(?:for|about|regarding|to)\b|[:;,!?。？！]|\.(?:\s|$)|$))`,
    'gi'
  ),
  new RegExp(
    String.raw`\b${SEARCH_EN}\s+(?:both\s+)?(${SEQUENCE})(?=\s*(?:\b(?:for|about|regarding|to)\b|[:;,!?。？！]|\.(?:\s|$)|$))`,
    'gi'
  ),
  new RegExp(
    String.raw`(${SEQUENCE})\s+(?:posts|threads|issues|pull requests|discussions)\b`,
    'gi'
  ),
  new RegExp(
    String.raw`${SEARCH_CN}\s*(${SEQUENCE})(?=\s*(?:上|里|平台|关于|有关|[:：，。!?？]|$))(?:\s*(?:上(?:面)?的?|里(?:的)?|平台(?:的)?))?`,
    'gi'
  )
];
const NEGATION_CN = String.raw`(?:不要|别|先别|不用|无需|不必|不需要|暂不|禁止|排除)`;
const NEGATED_SITE = new RegExp(
  String.raw`${NEGATION_CN}\s*(?:${SEARCH_CN}|用|访问)?\s*(?:(?:在|去|到|从)\s*)?${SEQUENCE}(?:\s*(?:上|里|平台))?(?:\s*${SEARCH_CN})?|(?:在\s*)?${SEQUENCE}(?:\s*(?:上|里|平台))?\s*${NEGATION_CN}\s*${SEARCH_CN}|\b(?:not|except|exclude|excluding|without|skip|avoid|(?:don't|do not|never)\s+(?:search|use|browse))\s+(?:on\s+)?${SEQUENCE}`,
  'gi'
);
const NO_WEB =
  /(?:不要|别|无需|不必|禁止|先不|暂不)\s*(?:上网|联网|搜索(?:网络|互联网|社区)|调用搜索)|\b(?:do not|don't|never|without|no)\s+(?:browse|use the internet|web search|search (?:online|the web)|use (?:community|online) search)\b/i;
const LOCAL_DOCUMENT =
  /(?:在|从|只看|仅看|只用|仅用|只根据|仅根据|只基于|仅基于)\s*(?:当前|这份|这篇|本页|本篇|此处|所选)?\s*(?:笔记|文档|原文|画板|白板|选区|选中内容|本文)(?:里|内|中)?|\b(?:in|inside|within|from)\s+(?:this|the current|my)\s+(?:note|document|board|canvas|selection)\b/i;
const DOCUMENT_REFERENCE =
  /(?:当前|这份|这篇|本篇|我的)\s*(?:笔记|文档|画板|白板)|正文|原文|全文|本文|选区|选中内容|\b(?:this|the|my|current)\s+(?:note|document|board|canvas|selection|paragraph)\b|\bselected text\b/i;
const PUBLIC_REFERENCE =
  /联网|上网|网上|网络|互联网|社区|论坛|帖子|讨论|公开|小红书|\b(?:online|internet|web|community|forums?|posts?|discussions?|issues?|pull requests?|github|reddit|xiaohongshu|rednote|twitter)\b/i;
const SIMPLE_GREETING =
  /^(?:你好|您好|嗨|哈喽|早上好|下午好|晚上好|谢谢|hi|hello|hey|thanks|thank you)[\s.!?。！？～~]*$/i;
const SAVE_CN =
  /(?:(?:并且?|然后|再|之后|接着|同时)\s*)?(?:把|将)?\s*(?:(?:找到的|搜到的|查到的|这些|相关的)\s*)?(?:(?:搜索|检索|研究|调研)?(?:结果|内容|资料|来源|链接|要点|讨论)\s*)?(?:整理(?:并写入|到|进|入)|写入|保存到|放进|追加到|收录(?:到|进)|记入|写进)\s*(?:当前|这篇|本篇|本页|这份|此处|这个)?\s*(?:笔记|文档)/i;
const SAVE_EN =
  /\b(?:(?:and(?: then)?|then)\s+)?(?:write|save|add|append|summarize|record|put|organize)\s+(?:(?:the |these |them |it )?(?:(?:search|research) )?(?:results|findings|links|sources|summary)\s+|(?:them|it)\s+)?(?:into|to|in)\s+(?:(?:the|my)\s+)?(?:current\s+|this\s+)?(?:note|document)\b/i;
const NO_SAVE =
  /(?:不要|别|无需|不必|先不|暂不|禁止).{0,12}(?:写入|保存|写进|整理(?:到|进|入)|收录|编辑|修改|追加)|\b(?:do not|don't|never|without)\s+(?:write|save|edit|add|append|record|put)\b/i;

function explicitSave(prompt: string): RegExpExecArray | null {
  if (NO_SAVE.test(prompt)) return null;
  const match = SAVE_CN.exec(prompt) ?? SAVE_EN.exec(prompt);
  if (!match) return null;
  const before = prompt.slice(0, match.index);
  if (
    new RegExp(String.raw`^\s*${REQUEST_PREFIX}$`, 'i').test(before) ||
    /[，,；;。.!?]\s*$/u.test(before) ||
    /^(?:并且?|然后|再|之后|接着|同时|and\b|then\b)/i.test(match[0])
  )
    return match;
  return null;
}

export function wantsResearchWrite(prompt: string): boolean {
  return !!explicitSave(prompt);
}

type ResearchSite = CommunitySource | 'xiaohongshu';

function siteNames(value: string): ResearchSite[] {
  return (value.match(new RegExp(NAME, 'gi')) ?? []).map((name) => {
    const key = name.toLowerCase();
    if (key === 'github' || key === 'reddit') return key;
    if (key === 'x' || key === 'twitter' || /^x\s*[(（]/.test(key)) return 'x';
    return 'xiaohongshu';
  });
}

function sourceScope(prompt: string): Set<ResearchSite> {
  const candidates = SITE_PHRASES.flatMap((phrase) => [...prompt.matchAll(phrase)]).sort(
    (a, b) => a.index! - b.index! || b[0].length - a[0].length
  );
  const named = new Set<ResearchSite>();
  let end = 0;
  for (const match of candidates) {
    const start = match.index!;
    if (start < end) continue;
    const previous = prompt.slice(0, start);
    const following = prompt.slice(start + match[0].length);
    const separatelyRequested =
      /(?:再|然后|同时|另外|另在|并)\s*$/u.test(previous) ||
      /\b(?:then|also)\s*$/i.test(previous) ||
      (/(?:[，,；;。!?.]|\band)\s*$/i.test(previous) &&
        (LEADING_COMMAND.test(match[0]) || LEADING_COMMAND.test(following)));
    // A later site name can be the topic of the first site's search. Only open a second scope
    // when the user joins sites in one list or gives a distinct instruction to search again.
    if (named.size && !separatelyRequested) continue;
    for (const site of siteNames(match[1])) named.add(site);
    end = start + match[0].length;
  }
  return named;
}

// Scope only grants or withholds tools. The model decides whether to call them and what to search.
export function communitySkillScope(prompt: string) {
  const none = { sources: [] as CommunitySource[], allowXiaohongshu: false };
  if (NO_WEB.test(prompt)) return none;
  const save = explicitSave(prompt);
  const searchPart = save ? prompt.slice(0, save.index) : prompt;
  if (
    LOCAL_DOCUMENT.test(searchPart) ||
    LEADING_LOCAL_TARGET.test(searchPart) ||
    QUOTED_EDIT.test(searchPart)
  ) {
    return none;
  }
  const denied = new Set<ResearchSite>();
  const request = searchPart.replace(NEGATED_SITE, (match) => {
    for (const site of siteNames(match)) denied.add(site);
    return ' ';
  });
  const named = sourceScope(request);
  if (
    !named.size &&
    (SIMPLE_GREETING.test(request.trim()) ||
      (DOCUMENT_REFERENCE.test(request) &&
        !COMMAND.test(request) &&
        !PUBLIC_REFERENCE.test(request)))
  ) {
    return none;
  }
  if (!COMMAND.test(request) && !/(?:帖子|讨论|posts|threads)/i.test(request)) named.delete('x');
  const available: ResearchSite[] = named.size ? [...named] : ['github', 'reddit', 'xiaohongshu'];
  const allowed = available.filter((site) => !denied.has(site));
  return {
    sources: allowed.filter((site): site is CommunitySource => site !== 'xiaohongshu'),
    allowXiaohongshu: allowed.includes('xiaohongshu')
  };
}
