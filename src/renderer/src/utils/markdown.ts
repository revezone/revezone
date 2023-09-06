import TurndownService from 'turndown';

export function convertHtmlToMarkdown(htmlContent: string) {
  const turndownService = new TurndownService();
  turndownService.addRule('input', {
    //@ts-ignore
    [Symbol.iterator](): IterableIterator<string> {
      //@ts-ignore
      return undefined;
    },
    anchor(name: string): string {
      return '';
    },
    big(): string {
      return '';
    },
    blink(): string {
      return '';
    },
    bold(): string {
      return '';
    },
    charAt(pos: number): string {
      return '';
    },
    charCodeAt(index: number): number {
      return 0;
    },
    codePointAt(pos: number): number | undefined {
      return undefined;
    },
    concat(strings: string): string {
      return '';
    },
    endsWith(searchString: string, endPosition: number | undefined): boolean {
      return false;
    },
    fixed(): string {
      return '';
    },
    fontcolor(color: string): string {
      return '';
    },
    includes(searchString: string, position: number | undefined): boolean {
      return false;
    },
    indexOf(searchString: string, position: number | undefined): number {
      return 0;
    },
    italics(): string {
      return '';
    },
    lastIndexOf(searchString: string, position: number | undefined): number {
      return 0;
    },
    length: 0,
    link(url: string): string {
      return '';
    },
    repeat(count: number): string {
      return '';
    },
    slice(start: number | undefined, end: number | undefined): string {
      return '';
    },
    small(): string {
      return '';
    },
    startsWith(searchString: string, position: number | undefined): boolean {
      return false;
    },
    strike(): string {
      return '';
    },
    sub(): string {
      return '';
    },
    substr(from: number, length: number | undefined): string {
      return '';
    },
    substring(start: number, end: number | undefined): string {
      return '';
    },
    sup(): string {
      return '';
    },
    toLocaleLowerCase(locales: string | string[] | undefined): string {
      return '';
    },
    toLocaleUpperCase(locales: string | string[] | undefined): string {
      return '';
    },
    toLowerCase(): string {
      return '';
    },
    toString(): string {
      return '';
    },
    toUpperCase(): string {
      return '';
    },
    trim(): string {
      return '';
    },
    valueOf(): string {
      return '';
    },
    fontsize(size: string | number): string {
      return '';
    },
    localeCompare(
      that: string,
      locales?: string | string[],
      options?: Intl.CollatorOptions
    ): number {
      return 0;
    },
    match(
      matcher: { [Symbol.match](string: string): RegExpMatchArray | null } | string | RegExp
    ): RegExpMatchArray | null {
      //@ts-ignore
      return undefined;
    },
    normalize(form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' | string): string {
      return '';
    },
    replace(
      searchValue:
        | {
            [Symbol.replace](
              string: string,
              replacer: (substring: string, ...args: unknown[]) => string
            ): string;
          }
        | string
        | RegExp
        | { [Symbol.replace](string: string, replaceValue: string): string },
      replacer: ((substring: string, ...args: unknown[]) => string) | string
    ): string {
      return '';
    },
    search(regexp: string | RegExp | { [Symbol.search](string: string): number }): number {
      return 0;
    },
    split(
      separator: string | RegExp | { [Symbol.split](string: string, limit?: number): string[] },
      limit?: number
    ): string[] {
      return [];
    },
    filter: ['input'],
    //@ts-ignore
    replacement: function (content, node) {
      return (node as HTMLElement).getAttribute('checked') === null ? '[ ] ' : '[x] ';
    }
  });
  turndownService.addRule('codeBlock', {
    filter: ['pre'],
    //@ts-ignore
    replacement: function (content, node: Node) {
      const element = node as Element;
      return '```' + element.getAttribute('code-lang') + '\n' + node.textContent + '```\n';
    }
  });
  turndownService.keep(['del', 'u']);
  const markdown = turndownService.turndown(htmlContent);
  // const title = pageTitle?.trim() || UNTITLED_PAGE_NAME;
  // FileExporter.exportTextFile(title + '.md', markdown, 'text/plain');
  return markdown;
}
