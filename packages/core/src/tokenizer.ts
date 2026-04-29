export type TokenType =
  | 'str'
  | 'id'
  | 'nl'
  | '{'
  | '}'
  | '['
  | ']'
  | ','
  | '->';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly line: number;
  readonly col: number;
}

const PUNCT: ReadonlySet<string> = new Set(['{', '}', '[', ']', ',']);
const STOP_RE = /[\s{}\[\],#"]/;

export function tokenize(source: string): Token[] {
  // Normalize line endings so CRLF inputs can't create stray '\r' tokens that
  // would otherwise stall the scanner.
  const normalized = source.replace(/\r\n?/g, '\n');
  const tokens: Token[] = [];
  const lines = normalized.split('\n');

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li] ?? '';
    let i = 0;

    while (i < line.length) {
      const ch = line[i];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        i++;
        continue;
      }
      if (ch === '#') break;

      if (ch === '"') {
        const startCol = i + 1;
        let j = i + 1;
        let s = '';
        while (j < line.length && line[j] !== '"') {
          s += line[j];
          j++;
        }
        tokens.push({ type: 'str', value: s, line: li + 1, col: startCol });
        i = j + 1;
        continue;
      }

      if (ch !== undefined && PUNCT.has(ch)) {
        tokens.push({
          type: ch as TokenType,
          value: ch,
          line: li + 1,
          col: i + 1,
        });
        i++;
        continue;
      }

      if (ch === '-' && line[i + 1] === '>') {
        tokens.push({ type: '->', value: '->', line: li + 1, col: i + 1 });
        i += 2;
        continue;
      }

      let j = i;
      let s = '';
      while (j < line.length) {
        const c = line[j];
        if (c === undefined) break;
        if (STOP_RE.test(c)) break;
        if (c === '-' && line[j + 1] === '>') break;
        s += c;
        j++;
      }
      if (s.length > 0) {
        tokens.push({ type: 'id', value: s, line: li + 1, col: i + 1 });
      }
      i = j;
    }

    tokens.push({ type: 'nl', value: '\n', line: li + 1, col: line.length + 1 });
  }

  return tokens;
}
