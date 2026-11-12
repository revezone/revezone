export const COMMUNITY_SEARCH_CHANNEL = 'revezone:community:search';
export const COMMUNITY_SOURCES = ['github', 'reddit', 'x'] as const;

export type CommunitySource = (typeof COMMUNITY_SOURCES)[number];

export type CommunityPost = {
  id: string;
  source: CommunitySource;
  title: string;
  url: string;
  publishedAt: string;
  excerpt?: string;
  community?: string;
};

export type CommunityQuery = {
  query: string;
  sources: CommunitySource[];
  sort: 'relevance' | 'recent';
};

export type CommunitySearchResponse = {
  posts: CommunityPost[];
  errors: Partial<Record<CommunitySource, string>>;
};

export type CommunityBridge = {
  search(input: CommunityQuery): Promise<CommunitySearchResponse>;
};
