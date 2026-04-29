import { BromaidError } from './errors.js';
import { closestMatch } from './names.js';
import { tokenize, type Token, type TokenType } from './tokenizer.js';
import type {
  BromaidContainer,
  BromaidEdge,
  BromaidElement,
  BromaidNode,
  CloudSlug,
  ContainerKind,
  Program,
} from './types.js';

const KNOWN_TYPES: ReadonlySet<string> = new Set<string>([
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

const CONTAINER_KEYWORDS: ReadonlySet<string> = new Set<string>([
  'region',
  'vpc',
  'group',
]);

function isKnownTypeKeyword(s: string): boolean {
  if (s.length === 0) return false;
  const lower = s.toLowerCase();
  if (KNOWN_TYPES.has(lower)) return true;
  if (CLOUD_SLUG_RE.test(lower)) return true;
  return false;
}

function isCloudSlug(s: string): s is CloudSlug {
  return CLOUD_SLUG_RE.test(s.toLowerCase());
}

/**
 * Internal mutable tree used during parsing. Containers carry a writable
 * children array so we can append while walking. We freeze the whole tree
 * into the readonly public types right before returning.
 */
type MutableElement = MutableContainer | BromaidNode;
interface MutableContainer {
  readonly kind: 'container';
  readonly id: string;
  readonly type: ContainerKind;
  readonly slug: CloudSlug | null;
  readonly label: string;
  readonly sublabel: string | null;
  readonly children: MutableElement[];
}

interface PendingEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string | null;
  readonly sourceLine: number;
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  const elements = new Map<string, BromaidElement>();
  const pendingEdges: PendingEdge[] = [];

  // We register elements by both id and label so edges can target either.
  // id wins; label is a fallback if not already taken — matches the prototype.
  const nameRegistry = new Map<string, MutableElement>();

  let pos = 0;
  let uidCounter = 0;
  const uid = (prefix: string): string => `${prefix}_${++uidCounter}`;

  const peek = (k = 0): Token | undefined => tokens[pos + k];

  const eat = (expected?: TokenType): Token => {
    const tk = tokens[pos++];
    if (tk === undefined) {
      throw new BromaidError('Unexpected end of input', {
        code: 'BRO_UNEXPECTED_EOF',
        line: null,
        col: null,
        hint: null,
        near: null,
      });
    }
    if (expected !== undefined && tk.type !== expected) {
      throw new BromaidError(
        `expected ${expected}, got ${tk.type} "${tk.value}"`,
        {
          code: 'BRO_UNEXPECTED_TOKEN',
          line: tk.line,
          col: tk.col,
          hint: null,
          near: tk.value,
        },
      );
    }
    return tk;
  };

  const skipNewlines = (): void => {
    while (true) {
      const tk = peek();
      if (tk === undefined || tk.type !== 'nl') break;
      pos++;
    }
  };

  const registerName = (el: MutableElement): void => {
    nameRegistry.set(el.id, el);
    if (el.label.length > 0 && !nameRegistry.has(el.label)) {
      nameRegistry.set(el.label, el);
    }
  };

  const parseAttrs = (): { label: string | null; slug: CloudSlug | null } => {
    const result: { label: string | null; slug: CloudSlug | null } = {
      label: null,
      slug: null,
    };
    if (peek()?.type !== '[') return result;
    eat('[');

    while (peek() !== undefined && peek()?.type !== ']') {
      const keyTok = eat('id');
      let key = keyTok.value;
      let val: string | true = true;

      // Support `key:value` glued form (e.g. `[label:foo]`).
      if (key.includes(':')) {
        const idx = key.indexOf(':');
        const tail = key.slice(idx + 1);
        key = key.slice(0, idx);
        val = tail;
        if (tail === '') {
          const next = peek();
          if (next !== undefined && (next.type === 'id' || next.type === 'str')) {
            val = eat().value;
          }
        }
      } else if (peek()?.type === 'str') {
        val = eat('str').value;
      } else if (peek()?.type === 'id') {
        val = eat('id').value;
      }

      if (key === 'label' && typeof val === 'string') {
        result.label = val;
      }
      if (key === 'slug' && typeof val === 'string' && isCloudSlug(val)) {
        result.slug = val;
      }

      if (peek()?.type === ',') eat(',');
    }
    eat(']');
    return result;
  };

  const parseBlock = (parent: MutableContainer): void => {
    skipNewlines();

    while (true) {
      const tk = peek();
      if (tk === undefined || tk.type === '}') break;
      if (tk.type === 'nl') {
        pos++;
        continue;
      }

      const first = eat('id');
      const kw = first.value;

      if (kw === 'edge') {
        const fromTok = eat();
        eat('->');
        const toTok = eat();
        const attrs = parseAttrs();
        pendingEdges.push({
          from: fromTok.value,
          to: toTok.value,
          label: attrs.label,
          sourceLine: first.line,
        });
        skipNewlines();
        continue;
      }

      let typeStr: string;
      let givenId: string | null = null;

      if (isKnownTypeKeyword(kw)) {
        typeStr = kw;
        if (peek()?.type === 'id') {
          givenId = eat('id').value;
        }
      } else if (peek()?.type === 'id') {
        typeStr = kw;
        givenId = eat('id').value;
      } else {
        typeStr = 'node';
        givenId = kw;
      }

      const labels: string[] = [];
      while (peek()?.type === 'str') {
        labels.push(eat('str').value);
      }

      const attrs = parseAttrs();
      const isContainer = peek()?.type === '{';
      const lowerType = typeStr.toLowerCase();
      // Slug detection: prefer the type position, but fall back to the id so
      // that both `region aws:eu-west-1 "..."` and `aws:eu-west-1 "..." { }`
      // pick up the AWS palette.
      const cloudSlug: CloudSlug | null =
        attrs.slug ??
        (isCloudSlug(typeStr)
          ? typeStr
          : givenId !== null && isCloudSlug(givenId)
            ? givenId
            : null);

      const resolvedId = givenId !== null ? givenId : uid(isContainer ? 'cnt' : 'nd');
      const label = labels[0] ?? givenId ?? typeStr;
      const sublabel = labels[1] ?? null;

      if (isContainer) {
        let containerType: ContainerKind;
        if (lowerType === 'subnet.public' || lowerType === 'subnet.private') {
          containerType = lowerType;
        } else if (CONTAINER_KEYWORDS.has(lowerType)) {
          containerType = lowerType as ContainerKind;
        } else if (cloudSlug !== null) {
          containerType = 'region';
        } else {
          containerType = 'group';
        }

        const container: MutableContainer = {
          kind: 'container',
          id: resolvedId,
          type: containerType,
          slug: cloudSlug,
          label,
          sublabel,
          children: [],
        };
        registerName(container);
        parent.children.push(container);

        eat('{');
        parseBlock(container);
        eat('}');
      } else {
        const node: BromaidNode = {
          kind: 'node',
          id: resolvedId,
          type: typeStr,
          slug: cloudSlug,
          label,
          sublabel,
        };
        registerName(node);
        parent.children.push(node);
      }
      skipNewlines();
    }
  };

  const root: MutableContainer = {
    kind: 'container',
    id: '__root__',
    type: 'group',
    slug: null,
    label: '',
    sublabel: null,
    children: [],
  };
  parseBlock(root);

  // Resolve edges (and emit a structured error on unknown names).
  const resolvedEdges: BromaidEdge[] = [];
  for (const e of pendingEdges) {
    const fromEl = nameRegistry.get(e.from);
    const toEl = nameRegistry.get(e.to);
    if (fromEl === undefined || toEl === undefined) {
      const missing = fromEl === undefined ? e.from : e.to;
      const known = [...nameRegistry.keys()].filter(
        (k) => !k.startsWith('cnt_') && !k.startsWith('nd_'),
      );
      const suggestion = closestMatch(missing, known);
      const knownStr =
        known.slice(0, 12).join(', ') + (known.length > 12 ? '…' : '');
      const hint =
        suggestion !== null
          ? `Did you mean "${suggestion}"? Known names: ${knownStr}`
          : `Known names: ${knownStr}`;
      throw new BromaidError(
        `unknown node "${missing}" in edge "${e.from} -> ${e.to}"`,
        {
          code: 'BRO_UNKNOWN_NODE',
          line: e.sourceLine,
          col: null,
          hint,
          near: missing,
        },
      );
    }
    resolvedEdges.push({
      from: e.from,
      to: e.to,
      fromId: fromEl.id,
      toId: toEl.id,
      label: e.label,
      sourceLine: e.sourceLine,
    });
  }

  // Freeze the tree and populate the elements map.
  const frozen = freezeContainer(root, elements);
  return {
    root: frozen,
    edges: Object.freeze(resolvedEdges),
    elements,
  };
}

function freezeContainer(
  c: MutableContainer,
  elements: Map<string, BromaidElement>,
): BromaidContainer {
  const children: BromaidElement[] = c.children.map((child) => {
    if (child.kind === 'container') {
      return freezeContainer(child, elements);
    }
    elements.set(child.id, child);
    return child;
  });
  const frozen: BromaidContainer = Object.freeze({
    kind: 'container' as const,
    id: c.id,
    type: c.type,
    slug: c.slug,
    label: c.label,
    sublabel: c.sublabel,
    children: Object.freeze(children),
  });
  if (c.id !== '__root__') {
    elements.set(frozen.id, frozen);
  }
  return frozen;
}
