import type { AiResearchManualLink } from '../../shared/ai';
import type { CommunityPost, CommunityQuery, CommunitySource } from '../../shared/community';
import { searchCommunity } from './communitySearch';

export type AgentSkillDefinition = {
  type: 'function';
  function: { name: string; description: string; parameters: object };
};

export type AgentSkillResult = {
  source: CommunitySource | 'xiaohongshu';
  query: string;
  posts: CommunityPost[];
  error?: string;
  manualLink?: AiResearchManualLink;
};

type SkillScope = { sources: readonly CommunitySource[]; allowXiaohongshu?: boolean };
type SkillArgs = Pick<CommunityQuery, 'query' | 'sort'>;

export type CommunityAgentSkills = {
  definitions: AgentSkillDefinition[];
  execute(name: string, args: unknown): Promise<AgentSkillResult>;
};

const skills = [
  {
    name: 'search_github',
    source: 'github',
    description:
      'Find public GitHub issues and pull requests. Use keywords, and optionally one repo:owner/name qualifier.'
  },
  {
    name: 'search_reddit',
    source: 'reddit',
    description:
      'Find public Reddit posts through the official OAuth API. The tool reports missing access if Reddit is unconfigured.'
  },
  {
    name: 'search_x',
    source: 'x',
    description:
      'Find public X posts from the last seven days through the official API. This tool may use X API credits and allows one query per request.'
  },
  {
    name: 'open_xiaohongshu_search',
    source: 'xiaohongshu',
    description:
      'Generate an official Xiaohongshu search link that the user can open. The result contains a link rather than retrieved posts.'
  }
] as const;

function readArgs(value: unknown, manual: boolean): SkillArgs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Search arguments must be a JSON object.');
  }
  const args = value as Record<string, unknown>;
  if (Object.keys(args).some((key) => key !== 'query' && (manual || key !== 'sort'))) {
    throw new Error('This skill received unsupported search arguments.');
  }
  const query = typeof args.query === 'string' ? args.query.trim().replace(/\s+/gu, ' ') : '';
  if (!query || query.length > 160 || !/[\p{L}\p{N}]/u.test(query) || /\p{Cc}/u.test(query)) {
    throw new Error('Enter search keywords of up to 160 characters.');
  }
  const sort = args.sort === undefined ? 'relevance' : args.sort;
  if (sort !== 'relevance' && sort !== 'recent') {
    throw new Error('Search sort must be relevance or recent.');
  }
  return { query, sort };
}

async function runSearch(source: CommunitySource, args: SkillArgs): Promise<AgentSkillResult> {
  const result = await searchCommunity({ ...args, sources: [source] });
  return {
    source,
    query: args.query,
    posts: result.posts,
    error: result.errors[source]
  };
}

export function createCommunityAgentSkills(scope: SkillScope): CommunityAgentSkills {
  const available = skills.filter(({ source }) =>
    source === 'xiaohongshu' ? scope.allowXiaohongshu === true : scope.sources.includes(source)
  );
  const definitions: AgentSkillDefinition[] = available.map(({ name, source, description }) => ({
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 160, description: 'Search keywords.' },
          ...(source === 'xiaohongshu'
            ? {}
            : { sort: { type: 'string', enum: ['relevance', 'recent'] } })
        },
        required: ['query'],
        additionalProperties: false
      }
    }
  }));
  let xSearch: { args: SkillArgs; result: Promise<AgentSkillResult> } | undefined;

  return {
    definitions,
    async execute(name, rawArgs) {
      const skill = available.find((candidate) => candidate.name === name);
      if (!skill) throw new Error('This skill is unavailable for the current request.');
      const args = readArgs(rawArgs, skill.source === 'xiaohongshu');
      if (skill.source === 'xiaohongshu') {
        const url = new URL('https://www.xiaohongshu.com/search_result');
        url.searchParams.set('keyword', args.query);
        return {
          source: skill.source,
          query: args.query,
          posts: [],
          manualLink: { source: 'xiaohongshu', url: url.href }
        };
      }

      if (skill.source !== 'x') return runSearch(skill.source, args);
      if (xSearch) {
        if (xSearch.args.query === args.query && xSearch.args.sort === args.sort) {
          return xSearch.result;
        }
        return {
          source: 'x',
          query: args.query,
          posts: [],
          error: 'X allows one search per request.'
        };
      }
      xSearch = { args, result: runSearch('x', args) };
      return xSearch.result;
    }
  };
}
