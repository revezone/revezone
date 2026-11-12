import { ArrowUpRight, FilePlus } from 'lucide-react';
import type { AiResult } from '../../../../shared/ai';
import type { CommunityPost } from '../../../../shared/community';
import type { AiStrings } from './strings';
import './research.css';

const platforms = { github: 'GitHub', reddit: 'Reddit', x: 'X' };

export function ResearchAnswer({ message, posts }: { message: string; posts: CommunityPost[] }) {
  return (
    <div>
      {message.split(/(\[\d+\])/g).map((part, index) => {
        const reference = /^\[(\d+)\]$/.exec(part);
        const post = reference ? posts[Number(reference[1]) - 1] : undefined;
        return post ? (
          <a
            key={index}
            className="rz-ai-inline-citation"
            href={post.url}
            title={post.title}
            target="_blank"
            rel="noreferrer noopener"
          >
            {part}
          </a>
        ) : (
          part
        );
      })}
    </div>
  );
}

export default function ResearchSources({
  research,
  strings,
  language,
  save,
  busy
}: {
  research: NonNullable<AiResult['research']>;
  strings: AiStrings;
  language: string;
  save?: () => void;
  busy: boolean;
}) {
  const format = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });
  const previewCount = 3;
  const renderSource = (post: CommunityPost) => (
    <li key={post.id}>
      <a href={post.url} target="_blank" rel="noreferrer noopener" data-testid="ai-research-source">
        {post.title} <ArrowUpRight size={12} aria-hidden="true" />
      </a>
      <div className="rz-ai-research-meta">
        <span>{platforms[post.source]}</span>
        <time dateTime={post.publishedAt}>{format.format(new Date(post.publishedAt))}</time>
      </div>
    </li>
  );

  return (
    <div className="rz-ai-research" data-testid="ai-research">
      {research.posts.length > 0 && (
        <div>
          <strong>
            {strings.researchSources} · {research.posts.length}
          </strong>
          <ol>{research.posts.slice(0, previewCount).map(renderSource)}</ol>
          {research.posts.length > previewCount && (
            <details>
              <summary>{strings.researchMore(research.posts.length - previewCount)}</summary>
              <ol start={previewCount + 1}>
                {research.posts.slice(previewCount).map(renderSource)}
              </ol>
            </details>
          )}
        </div>
      )}
      {research.sources.map(
        (source) =>
          research.errors[source] && (
            <p
              className="rz-ai-research-meta"
              key={source}
              data-testid={'ai-research-error-' + source}
            >
              {platforms[source]} · {research.errors[source]}
            </p>
          )
      )}
      {research.manualLinks?.map(({ source, url }) => (
        <a
          href={url}
          key={source}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="ai-research-manual"
        >
          {strings.researchXiaohongshu} <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      ))}
      {save && (
        <button type="button" data-testid="ai-research-save" disabled={busy} onClick={save}>
          <FilePlus size={14} aria-hidden="true" />
          {research.posts.length > 10 ? strings.researchSaveFirst : strings.researchSave}
        </button>
      )}
    </div>
  );
}
