import { useState } from 'react';
import { ArrowUpRight, FilePlus } from 'lucide-react';
import {
  isXiaohongshuCalendarDate,
  normalizeXiaohongshuPostUrl,
  xiaohongshuSearchUrl
} from '../../../../shared/xiaohongshu';
import type { AiEditorAdapter } from '@renderer/ai/editorRegistry';
import { AppliedSaveError, applyAiOperations } from '@renderer/ai/editorRegistry';

const english = {
  name: 'Xiaohongshu',
  search: 'Search on Xiaohongshu',
  open: 'Open Xiaohongshu',
  collect: 'Save an original post',
  paste: 'Post link or share text',
  title: 'Title (optional)',
  date: 'Publication date',
  time: 'Time (UTC+8)',
  dateHelp: 'Use the date and time shown on the post. Leave either field blank if unknown.',
  badUrl: 'Paste an official Xiaohongshu post or share link.',
  badDate: 'Enter a complete date to save the time.',
  shortLink: 'Check that the share link opens the original post.',
  preview: 'Check original link',
  openNote: 'Open a note to save this source.',
  save: 'Add to current note',
  saved: 'Xiaohongshu source added to the note.',
  saving: 'Adding…',
  failure: 'Could not save the source. Try again.',
  uncertain: 'The note changed, but saving could not be confirmed. Check version history.',
  heading: 'Xiaohongshu source',
  post: 'Open original Xiaohongshu post'
};
const chinese: typeof english = {
  name: '小红书',
  search: '在小红书搜索',
  open: '打开小红书',
  collect: '手动收录原帖',
  paste: '原帖链接或分享文案',
  title: '标题（可选）',
  date: '发布日期',
  time: '时间（北京时间）',
  dateHelp: '按原帖显示的发布时间填写，不确定的字段留空。',
  badUrl: '请粘贴小红书官方原帖链接或分享链接。',
  badDate: '填写时间时需要提供完整的日期。',
  shortLink: '请确认分享链接能打开原帖。',
  preview: '查看原帖链接',
  openNote: '打开一篇笔记即可收录。',
  save: '整理进当前笔记',
  saved: '已将小红书原帖整理进笔记。',
  saving: '正在收录…',
  failure: '收录失败，请重试。',
  uncertain: '笔记已更新，但保存未能确认。请查看版本历史。',
  heading: '小红书收录',
  post: '打开小红书原帖'
};

function extractPostUrl(value: string) {
  const direct = normalizeXiaohongshuPostUrl(value.trim());
  if (direct) return direct;
  const urls = value.match(/https?:\/\/[^\s<>"“”‘’。，、；！）》】]+/gi) ?? [];
  return urls
    .map((url) => normalizeXiaohongshuPostUrl(url.replace(/[)\],.!;]+$/g, '')))
    .find(Boolean);
}

export default function XiaohongshuCapture({
  query,
  language,
  target
}: {
  query: string;
  language: string;
  target?: AiEditorAdapter;
}) {
  const copy = language.startsWith('zh') ? chinese : english;
  const [input, setInput] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const url = extractPostUrl(input);
  const invalidDate = (!!date && !isXiaohongshuCalendarDate(date)) || (!!time && !date);
  const short = !!url && ['xhslink.com', 'www.xhslink.com'].includes(new URL(url).hostname);

  async function save() {
    if (!url || !target || saving || invalidDate) return;
    setSaving(true);
    setNotice(undefined);
    const publishedAt = date && time ? date + 'T' + time + '+08:00' : date;
    const clear = () => {
      setInput('');
      setTitle('');
      setDate('');
      setTime('');
    };
    try {
      await applyAiOperations(
        target,
        [
          {
            type: 'appendResearch',
            query: copy.heading,
            results: [
              {
                source: 'xiaohongshu',
                url,
                title: title.trim() || copy.post,
                ...(publishedAt ? { publishedAt } : {})
              }
            ]
          }
        ],
        target.context(),
        copy.heading
      );
      clear();
      setNotice({ text: copy.saved });
    } catch (error) {
      if (error instanceof AppliedSaveError) clear();
      setNotice({
        text: error instanceof AppliedSaveError ? copy.uncertain : copy.failure,
        error: true
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rz-community-xhs" data-testid="community-xhs">
      <div className="rz-community-xhs-header">
        <strong>{copy.name}</strong>
        <a
          href={xiaohongshuSearchUrl(query)}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="community-xhs-search"
        >
          {query.trim() ? copy.search : copy.open} <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      <details>
        <summary>{copy.collect}</summary>
        <form
          className="rz-community-xhs-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            {copy.paste}
            <textarea
              value={input}
              maxLength={4000}
              rows={2}
              onChange={(event) => setInput(event.target.value)}
              data-testid="community-xhs-url"
            />
          </label>
          {input.trim() && !url && <p className="rz-ai-error">{copy.badUrl}</p>}
          {url && (
            <p className="rz-ai-muted">
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                data-testid="community-xhs-original"
              >
                {copy.preview} <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              {short && <span> · {copy.shortLink}</span>}
            </p>
          )}
          <label>
            {copy.title}
            <input
              value={title}
              maxLength={300}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="rz-community-xhs-time">
            <label>
              {copy.date}
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                data-testid="community-xhs-date"
              />
            </label>
            <label>
              {copy.time}
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                data-testid="community-xhs-time"
              />
            </label>
          </div>
          <p className="rz-ai-muted">{invalidDate ? copy.badDate : copy.dateHelp}</p>
          {!target && <p className="rz-ai-muted">{copy.openNote}</p>}
          {notice && (
            <p
              role={notice.error ? 'alert' : 'status'}
              className={notice.error ? 'rz-ai-error' : 'rz-ai-success'}
              data-testid="community-xhs-status"
            >
              {notice.text}
            </p>
          )}
          <button
            className="rz-ai-primary"
            type="submit"
            disabled={!target || !url || invalidDate || saving}
            data-testid="community-xhs-save"
          >
            <FilePlus size={15} aria-hidden="true" />
            {saving ? copy.saving : copy.save}
          </button>
        </form>
      </details>
    </div>
  );
}
