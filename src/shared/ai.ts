import type { JsonValue } from './versionHistory';
import type { CommunityPost, CommunitySource } from './community';

export const AI_CHANNELS = {
  status: 'revezone:ai:status',
  request: 'revezone:ai:request',
  preview: 'revezone:ai:preview'
} as const;

export type AiContext = {
  kind: 'note' | 'board';
  boardEngine?: 'tldraw';
  items: {
    id: string;
    type: string;
    text?: string;
    parentId?: string;
    [key: string]: JsonValue | undefined;
  }[];
  selection: string[];
  truncated?: boolean;
};

export type AiOperation = { type: string; [key: string]: JsonValue };
export type AiTurn = { role: 'user' | 'assistant'; content: string };
export type AiRequest = {
  mode: 'chat' | 'suggest';
  prompt: string;
  previousResearchQuery?: string;
  context: AiContext;
  history: AiTurn[];
};
export type AiResearchManualLink = { source: 'xiaohongshu'; url: string };
export type AiResearch = {
  query: string;
  sources: CommunitySource[];
  posts: CommunityPost[];
  errors: Partial<Record<CommunitySource, string>>;
  summaryStatus: 'summarized' | 'sources-only' | 'no-results';
  manualLinks?: AiResearchManualLink[];
  saveToNote?: boolean;
};
export type AiResult = {
  intent: 'reply' | 'edit' | 'suggestion';
  message: string;
  operations: AiOperation[];
  research?: AiResearch;
};
export type AiStatus = { ready: boolean; local: boolean; model: string; message?: string };
export type AiBridge = {
  status(): Promise<AiStatus>;
  request(input: AiRequest, onMessage?: (text: string) => void): Promise<AiResult>;
};
