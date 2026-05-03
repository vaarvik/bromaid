'use client';

import { useCallback, useMemo, useRef } from 'react';

type SpanKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'punct'
  | 'arrow'
  | 'keyword'
  | 'type'
  | 'name'
  | 'attrKey'
  | 'id';

type Span = { readonly kind: SpanKind; readonly text: string };

const STOP_RE = /[\s{}\[\],#"]/;

const CONTAINER_KEYWORDS: ReadonlySet<string> = new Set(['region', 'vpc', 'group']);

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  'region',
  'vpc',
  'group',
  'subnet.public',
  'subnet.private',
  'db',
  'actor',
  'external',
  's3',
  'service',
  'addon',
  'node',
]);

const CLOUD_SLUG_RE =
  /^(aws|azure|gcp|github|cloudflare|slack|stripe|keycloak|posthog|intercom|tailscale|coolify|nextjs|redis|datadog|sendgrid|sharepoint|entra|ssm|traefik|oauth2-proxy|hatchet|kuma)(:[a-z0-9_-]+)*$/;

const MONOKAI: Record<SpanKind, React.CSSProperties> = {
  plain: { color: '#F8F8F2' },
  comment: { color: '#75715E', fontStyle: 'italic' },
  string: { color: '#E6DB74' },
  punct: { color: '#F8F8F2' },
  arrow: { color: '#F92672' },
  keyword: { color: '#F92672' },
  type: { color: '#66D9EF', fontStyle: 'italic' },
  name: { color: '#A6E22E' },
  attrKey: { color: '#FD971F' },
  id: { color: '#F8F8F2' },
};

function pushSpan(out: Span[], kind: SpanKind, text: string): void {
  if (text === '') return;
  const last = out[out.length - 1];
  if (last !== undefined && last.kind === kind) {
    out[out.length - 1] = { kind, text: last.text + text };
    return;
  }
  out.push({ kind, text });
}

function highlight(source: string): Span[] {
  const out: Span[] = [];
  let bracketDepth = 0;
  let expectName = false;
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i] as string;

    if (ch === '\n') {
      pushSpan(out, 'plain', ch);
      expectName = false;
      i++;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let j = i;
      while (j < len) {
        const c = source[j];
        if (c !== ' ' && c !== '\t' && c !== '\r') break;
        j++;
      }
      pushSpan(out, 'plain', source.slice(i, j));
      i = j;
      continue;
    }

    if (ch === '#') {
      let j = i;
      while (j < len && source[j] !== '\n') j++;
      pushSpan(out, 'comment', source.slice(i, j));
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < len && source[j] !== '"' && source[j] !== '\n') j++;
      const end = source[j] === '"' ? j + 1 : j;
      pushSpan(out, 'string', source.slice(i, end));
      i = end;
      expectName = false;
      continue;
    }

    if (ch === '-' && source[i + 1] === '>') {
      pushSpan(out, 'arrow', '->');
      i += 2;
      expectName = false;
      continue;
    }

    if (ch === '{' || ch === '}' || ch === ',') {
      pushSpan(out, 'punct', ch);
      i++;
      expectName = false;
      continue;
    }
    if (ch === '[') {
      pushSpan(out, 'punct', ch);
      bracketDepth++;
      i++;
      expectName = false;
      continue;
    }
    if (ch === ']') {
      pushSpan(out, 'punct', ch);
      bracketDepth = Math.max(0, bracketDepth - 1);
      i++;
      expectName = false;
      continue;
    }

    let j = i;
    while (j < len) {
      const c = source[j] as string;
      if (STOP_RE.test(c)) break;
      if (c === '-' && source[j + 1] === '>') break;
      j++;
    }
    if (j === i) {
      pushSpan(out, 'plain', ch);
      i++;
      continue;
    }
    const word = source.slice(i, j);
    const lower = word.toLowerCase();

    let kind: SpanKind;
    if (bracketDepth > 0 && word.endsWith(':')) {
      kind = 'attrKey';
    } else if (CONTAINER_KEYWORDS.has(lower)) {
      kind = 'keyword';
    } else if (KNOWN_TYPES.has(lower) || CLOUD_SLUG_RE.test(lower)) {
      kind = 'type';
    } else if (expectName) {
      kind = 'name';
    } else {
      kind = 'id';
    }
    pushSpan(out, kind, word);

    if (kind === 'keyword' || kind === 'type') expectName = true;
    else if (kind === 'name') expectName = false;

    i = j;
  }

  return out;
}

const SHARED_TEXT_STYLE: React.CSSProperties = {
  margin: 0,
  padding: 12,
  border: 0,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 13,
  lineHeight: 1.45,
  letterSpacing: 0,
  tabSize: 2,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  boxSizing: 'border-box',
};

export function SyntaxEditor({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
}) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const spans = useMemo(() => highlight(value), [value]);

  const onScroll = useCallback(() => {
    const ta = taRef.current;
    const pre = preRef.current;
    if (ta === null || pre === null) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#222728',
        overflow: 'hidden',
      }}
    >
      <pre
        ref={preRef}
        aria-hidden="true"
        style={{
          ...SHARED_TEXT_STYLE,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          color: '#F8F8F2',
          pointerEvents: 'none',
        }}
      >
        {spans.map((s, idx) => (
          <span key={idx} style={MONOKAI[s.kind]}>
            {s.text}
          </span>
        ))}
        {value.endsWith('\n') ? '​' : ''}
      </pre>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={onScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        style={{
          ...SHARED_TEXT_STYLE,
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          resize: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: '#F8F8F2',
        }}
      />
    </div>
  );
}
