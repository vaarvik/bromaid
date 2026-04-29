# bromaid DSL — Language Specification (v0.1, draft)

This is a working draft. The grammar is informal at the moment; a formal EBNF will land alongside the v1.0 release.

## Lexical structure

A bromaid source file is plain UTF-8 text. The tokenizer recognises:

- **Whitespace** (` `, `\t`) — separates tokens, otherwise insignificant.
- **Newlines** — significant only as statement terminators.
- **Comments** — `#` to end of line.
- **Strings** — double-quoted, no escapes yet (`"like this"`).
- **Punctuation** — `{`, `}`, `[`, `]`, `,`.
- **Arrow** — `->` (used in `edge` declarations).
- **Identifiers** — anything else not containing whitespace or the punctuation above. Slug-style identifiers like `aws:eu-west-1` are valid identifiers.

## Statements

A program is a sequence of top-level statements separated by newlines. The same statement set is recognised inside any container block.

### Node declaration

```
<type> <id> "<label>" "<sublabel>"?
```

- `<type>` is either a known node type (`db`, `actor`, `external`, `s3`, `service`, `node`) or a slug (`aws:rds`, `azure:openai`, `gcp:gemini`, `github`, `cloudflare`, `slack`, `stripe`, `keycloak`, `posthog`, `intercom`, …). Slugs are used for theming (colors) and, optionally, icons.
- `<id>` is optional. If omitted, an anonymous id is generated.
- A node may have **0**, **1**, or **2** trailing string labels. The first becomes `label`, the second `sublabel`.
- Bare-form `myname` (no recognised type keyword) is parsed as an anonymous `node` named `myname`.

### Container declaration

```
<containerType> <id>? "<label>" {
  ...statements...
}
```

Container types: `region`, `vpc`, `group`, `subnet.public`, `subnet.private`. A cloud slug used as the container type (e.g. `region aws:eu-west-1 "..."` or just `aws:eu-west-1 "..." { ... }`) implies a `region`.

### Edge declaration

```
edge <from-id> -> <to-id> [label: "..."]?
```

The optional `[…]` block contains attributes. Today only `label:` is recognised. Both `from` and `to` must reference a previously declared node or container by `id` or by `label` (label resolution is best-effort and used only when the id is not unique).

## Reserved keywords

`region`, `vpc`, `group`, `subnet.public`, `subnet.private`, `db`, `actor`, `external`, `s3`, `service`, `node`, `edge`.

Slug prefixes that act as reserved type keywords: `aws`, `azure`, `gcp`, `github`, `cloudflare`, `slack`, `stripe`, `keycloak`, `posthog`, `intercom`, `tailscale`, `coolify`, `nextjs`, `redis`, `datadog`, `sendgrid`, `sharepoint`.

## Errors

The parser reports a structured `BromaidError` with:

- `message` — human-readable text.
- `code` — stable error code (e.g. `BRO_UNKNOWN_NODE`, `BRO_UNEXPECTED_TOKEN`).
- `line`, `col` — source location.
- `hint` — optional "did you mean…?" suggestion.

## Grammar (planned, EBNF, not yet final)

```ebnf
program     = { statement } ;
statement   = ( decl | edge ) , newline ;
decl        = type , [ id ] , { string } , [ block ] ;
block       = "{" , { statement } , "}" ;
edge        = "edge" , id , "->" , id , [ attrs ] ;
attrs       = "[" , attr , { "," , attr } , "]" ;
attr        = ident , [ ":" , ( ident | string ) ] ;
type        = ident ;            (* validated against KNOWN_TYPES + CLOUD_SLUG_RE *)
id          = ident ;
ident       = ? non-whitespace, non-punctuation ? ;
string      = ? double-quoted ? ;
```
