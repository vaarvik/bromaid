/**
 * Regenerate the root SPEC.md from the canonical schema module.
 *
 * The enum tables (node types, container kinds, cloud slugs, attribute keys)
 * are pulled live from `@bromaid/core` so they cannot drift from what the
 * parser actually accepts. The grammar prose is hand-written.
 *
 * Run with: `pnpm gen:spec`
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ATTR_KEYS,
  ATTR_KEY_META,
  CLOUD_VENDORS,
  CLOUD_VENDOR_META,
  CONTAINER_KINDS,
  CONTAINER_KIND_META,
  KNOWN_NODE_KINDS,
  NODE_TYPE_META,
} from '@bromaid/core';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

function table(
  header: readonly [string, string],
  rows: ReadonlyArray<readonly [string, string]>,
): string {
  const head = `| ${header[0]} | ${header[1]} |\n| --- | --- |`;
  const body = rows
    .map(([k, v]) => `| \`${k}\` | ${v.replace(/\|/g, '\\|')} |`)
    .join('\n');
  return `${head}\n${body}`;
}

async function readExample(name: string): Promise<string> {
  return readFile(resolve(repo, 'examples', `${name}.bro`), 'utf8');
}

async function main(): Promise<void> {
  const nodeRows = KNOWN_NODE_KINDS.map(
    (k) => [k, NODE_TYPE_META[k]] as const,
  );
  const containerRows = CONTAINER_KINDS.map(
    (k) => [k, CONTAINER_KIND_META[k]] as const,
  );
  const vendorRows = CLOUD_VENDORS.map(
    (k) => [k, CLOUD_VENDOR_META[k]] as const,
  );
  const attrRows = ATTR_KEYS.map((k) => [k, ATTR_KEY_META[k]] as const);

  const microExample = (await readExample('micro')).trim();

  const md = `<!--
  AUTO-GENERATED. Do not edit by hand.
  Source: scripts/gen-spec.ts + packages/core/src/schema.ts
  Regenerate: pnpm gen:spec
-->

# bromaid DSL — Language Specification

> A small, line-oriented diagrams-as-code DSL. This document is the canonical
> reference. Both humans and AI assistants are expected to read it.
>
> The lists below (node types, container kinds, cloud slugs, attribute keys)
> are generated directly from \`@bromaid/core\`'s schema module — what you see
> here is exactly what the parser accepts.

## At a glance

\`\`\`bro
${microExample}
\`\`\`

## Lexical structure

A bromaid source file is plain UTF-8 text. The tokenizer recognises:

- **Whitespace** (\` \`, \`\\t\`, \`\\r\`) — separates tokens, otherwise insignificant. CRLF is normalised to LF.
- **Newlines** — significant only as statement terminators.
- **Comments** — \`#\` to end of line. No block comments.
- **Strings** — double-quoted, no escapes (\`"like this"\`). An unterminated string runs to the end of the line.
- **Punctuation** — \`{\`, \`}\`, \`[\`, \`]\`, \`,\`.
- **Arrow** — \`->\` (used in \`edge\` declarations).
- **Identifiers** — anything else, up to the next whitespace, punctuation, or \`->\`. Slug-style identifiers like \`aws:eu-west-1\` and dotted ids like \`subnet.public\` are valid identifiers.

## Statements

A program is a sequence of top-level statements separated by newlines. The same statement set is recognised inside any container block.

### Node declaration

\`\`\`
<type> <id>? "<label>"? "<sublabel>"?  [attrs]?
\`\`\`

- \`<type>\` is one of the [built-in node types](#node-types), one of the [container types](#container-types), or a [cloud slug](#cloud-slugs). Unknown identifiers in type position fall through to the bare-form rule below.
- \`<id>\` is optional. If omitted, an anonymous id like \`nd_3\` / \`cnt_2\` is generated.
- A node may carry **0**, **1**, or **2** trailing string labels. The first becomes \`label\`, the second \`sublabel\`. With no labels, \`label\` defaults to \`<id>\` (or to \`<type>\` if there is no id either).
- **Bare form**: a single identifier with no recognised type keyword (e.g. \`gateway\`) is parsed as an anonymous node of type \`node\` named \`gateway\`. Useful for sketching.

### Container declaration

\`\`\`
<containerType> <id>? "<label>"? [attrs]? {
  ...statements...
}
\`\`\`

- \`<containerType>\` is any [container type](#container-types) keyword, or a [cloud slug](#cloud-slugs). A cloud slug used in container position (e.g. \`region aws:eu-west-1 "..."\` or \`aws:eu-west-1 "..." { … }\`) implies a \`region\` container with that vendor's theming.
- Container type inference (when no keyword is present): a slug → \`region\`; otherwise → \`group\`.

### Edge declaration

\`\`\`
edge <from> -> <to> [label: "..."]?
\`\`\`

- \`<from>\` and \`<to>\` reference an element by **id** first; if not found, by **label**. Label resolution is best-effort: the first declared element with that label wins.
- Edges may appear at the top level or inside any container.
- The optional attribute block currently understands \`label\` only.

## Reference

### Node types

${table(['Type', 'Description'], nodeRows)}

### Container types

${table(['Type', 'Description'], containerRows)}

### Cloud slugs

A slug is a vendor optionally followed by one or more \`:segment\` refinements (e.g. \`aws:eu-west-1\`, \`aws:rds\`, \`azure:openai\`). The full pattern is:

\`\`\`
^(<vendor>)(:[a-z0-9_-]+)*$
\`\`\`

${table(['Vendor', 'Description'], vendorRows)}

### Attribute keys

Used inside \`[ … ]\` blocks attached to declarations and edges. Both \`[key:value]\` (glued) and \`[key: "value"]\` (separated) forms are accepted. Multiple attributes are comma-separated.

${table(['Key', 'Description'], attrRows)}

## Errors

The parser reports a structured \`BromaidError\` with:

- \`message\` — human-readable text.
- \`code\` — stable error code.
- \`line\`, \`col\` — source location.
- \`hint\` — optional "did you mean…?" suggestion.
- \`near\` — the offending token, if known.

| Code | When |
| --- | --- |
| \`BRO_UNEXPECTED_TOKEN\` | Got a token that is not allowed at this position. |
| \`BRO_UNEXPECTED_EOF\` | Source ended mid-statement. |
| \`BRO_UNKNOWN_NODE\` | An edge references an id/label that was never declared. |
| \`BRO_DUPLICATE_ID\` | Reserved for future use. |

## Runtime validation

\`@bromaid/core\` ships Zod schemas for every part of the DSL surface so any AST — whether produced by \`parse()\` or by an external producer (an MCP tool, an AI assistant, a JSON API) — can be validated at runtime:

\`\`\`ts
import { ProgramSchema, BromaidNodeSchema, parse } from '@bromaid/core';

const program = parse(source);
ProgramSchema.parse(program);              // throws if malformed

// Or validate hand-built JSON:
BromaidNodeSchema.parse({
  kind: 'node', id: 'lb', type: 'service',
  slug: null, label: 'Load Balancer', sublabel: null,
});
\`\`\`

Schemas exported from \`@bromaid/core\`:

- Enums: \`KnownNodeKindSchema\`, \`ContainerKindSchema\`, \`CloudVendorSchema\`, \`AttrKeySchema\`
- Strings: \`CloudSlugSchema\` (regex-validated), \`NodeKindSchema\` (well-known | string)
- AST: \`BromaidNodeSchema\`, \`BromaidContainerSchema\`, \`BromaidElementSchema\`, \`BromaidEdgeSchema\`, \`ProgramSchema\`

## Grammar (EBNF, informative)

\`\`\`ebnf
program     = { statement } ;
statement   = ( decl | edge ) , newline ;
decl        = type , [ id ] , { string } , [ attrs ] , [ block ] ;
block       = "{" , { statement } , "}" ;
edge        = "edge" , ref , "->" , ref , [ attrs ] ;
attrs       = "[" , attr , { "," , attr } , "]" ;
attr        = ident , [ ":" , ( ident | string ) ] ;
type        = ident ;             (* validated against schema enums + CLOUD_SLUG_RE *)
ref         = ident ;             (* resolved by id, then by label *)
id          = ident ;
ident       = ? non-whitespace, non-punctuation, no "->" ? ;
string      = ? double-quoted, no escapes ? ;
\`\`\`
`;

  await writeFile(resolve(repo, 'SPEC.md'), md, 'utf8');
  process.stdout.write(`gen-spec: wrote ${resolve(repo, 'SPEC.md')}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(
    `gen-spec: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
