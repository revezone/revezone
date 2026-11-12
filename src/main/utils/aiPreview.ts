const MAX_OUTPUT_CHARS = 30000;
const MAX_MESSAGE_CHARS = 5000;

function jsonStart(output: string) {
  return output.trimStart().replace(/^~~~(?:json)?\s*|^```(?:json)?\s*/i, '');
}

function skipSpace(source: string, offset: number) {
  while (offset < source.length && /\s/.test(source[offset])) offset++;
  return offset;
}

// The returned index is the closing quote or the end of the last complete escape.
function stringEnd(source: string, start: number) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '"') return { index, complete: true };
    if (source[index] === '\\') {
      const escapeLength = source[index + 1] === 'u' ? 6 : 2;
      if (index + escapeLength > source.length) break;
      index += escapeLength;
    } else {
      index++;
    }
  }
  return { index, complete: false };
}

function propertyValue(source: string, property: string) {
  if (source[0] !== '{') return -1;
  let depth = 1;
  let previous = '{';
  for (let index = 1; index < source.length; index++) {
    const char = source[index];
    if (/\s/.test(char)) continue;
    if (char === '"') {
      const end = stringEnd(source, index);
      if (!end.complete) return -1;
      if (depth === 1 && (previous === '{' || previous === ',')) {
        if (JSON.parse(source.slice(index, end.index + 1)) === property) {
          const colon = skipSpace(source, end.index + 1);
          return source[colon] === ':' ? skipSpace(source, colon + 1) : -1;
        }
      }
      index = end.index;
    } else if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      if (--depth === 0) break;
    }
    previous = char;
  }
  return -1;
}

export function previewMessage(output: string) {
  if (output.length > MAX_OUTPUT_CHARS) return undefined;
  try {
    const source = jsonStart(output);
    const start = propertyValue(source, 'message');
    if (source[start] !== '"') return undefined;
    const { index } = stringEnd(source, start);
    const text: string = JSON.parse(source.slice(start, index) + '"');
    return text.slice(0, MAX_MESSAGE_CHARS).replace(/[\uD800-\uDBFF]$/u, '');
  } catch {
    return undefined;
  }
}

export function previewHighlights(output: string): unknown[] {
  if (output.length > MAX_OUTPUT_CHARS) return [];
  const source = jsonStart(output);
  const items: unknown[] = [];
  try {
    const start = source[0] === '[' ? 0 : propertyValue(source, 'highlights');
    if (source[start] !== '[') return items;
    let depth = 0;
    let objectStart = -1;
    for (let index = start + 1; index < source.length && items.length < 3; index++) {
      const char = source[index];
      if (char === '"') {
        const end = stringEnd(source, index);
        if (!end.complete) break;
        index = end.index;
      } else if (char === '{' || char === '[') {
        if (depth++ === 0 && char === '{') objectStart = index;
      } else if (char === '}' || char === ']') {
        if (depth === 0) break;
        if (--depth === 0 && char === '}' && objectStart !== -1) {
          items.push(JSON.parse(source.slice(objectStart, index + 1)));
          objectStart = -1;
        }
      }
    }
  } catch {
    // A partially generated item may be invalid. Keep the completed items.
  }
  return items;
}
