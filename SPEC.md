<!--
  AUTO-GENERATED. Do not edit by hand.
  Source: scripts/gen-spec.ts + packages/core/src/schema.ts
  Regenerate: pnpm gen:spec
-->

# bromaid DSL — Language Specification

> A small, line-oriented diagrams-as-code DSL. This document is the canonical
> reference. Both humans and AI assistants are expected to read it.
>
> The lists below (node types, container kinds, cloud slugs, attribute keys)
> are generated directly from `@bromaid/core`'s schema module — what you see
> here is exactly what the parser accepts.

## At a glance

```bro
# Small SaaS — single region, web + api + data, one third-party.

actor user "User"
github gh "GitHub" "CI/CD"
stripe stripe "Stripe" "Payments"

region aws:eu-west-1 "Production" {
  addon "CloudTrail" [slug: aws:cloudtrail]

  vpc "VPC" {
    subnet.public "Public" {
      service lb "Load Balancer"
    }
    subnet.private "App" {
      nextjs web "Web"
      service api "API"
    }
    subnet.private "Data" {
      db postgres "PostgreSQL"
      redis cache "Redis"
    }
  }
}

edge user -> lb
edge lb -> web
edge web -> api
edge api -> postgres
edge api -> cache
edge api -> stripe [label: charges]
edge gh -> lb [label: deploy]
```

## Lexical structure

A bromaid source file is plain UTF-8 text. The tokenizer recognises:

- **Whitespace** (` `, `\t`, `\r`) — separates tokens, otherwise insignificant. CRLF is normalised to LF.
- **Newlines** — significant only as statement terminators.
- **Comments** — `#` to end of line. No block comments.
- **Strings** — double-quoted, no escapes (`"like this"`). An unterminated string runs to the end of the line.
- **Punctuation** — `{`, `}`, `[`, `]`, `,`.
- **Arrow** — `->` (used in `edge` declarations).
- **Identifiers** — anything else, up to the next whitespace, punctuation, or `->`. Slug-style identifiers like `aws:eu-west-1` and dotted ids like `subnet.public` are valid identifiers.

## Statements

A program is a sequence of top-level statements separated by newlines. The same statement set is recognised inside any container block.

### Node declaration

```
<type> <id>? "<label>"? "<sublabel>"?  [attrs]?
```

- `<type>` is one of the [built-in node types](#node-types), one of the [container types](#container-types), or a [cloud slug](#cloud-slugs). Unknown identifiers in type position fall through to the bare-form rule below.
- `<id>` is optional. If omitted, an anonymous id like `nd_3` / `cnt_2` is generated.
- A node may carry **0**, **1**, or **2** trailing string labels. The first becomes `label`, the second `sublabel`. With no labels, `label` defaults to `<id>` (or to `<type>` if there is no id either).
- **Bare form**: a single identifier with no recognised type keyword (e.g. `gateway`) is parsed as an anonymous node of type `node` named `gateway`. Useful for sketching.

### Container declaration

```
<containerType> <id>? "<label>"? [attrs]? {
  ...statements...
}
```

- `<containerType>` is any [container type](#container-types) keyword, or a [cloud slug](#cloud-slugs). A cloud slug used in container position (e.g. `region aws:eu-west-1 "..."` or `aws:eu-west-1 "..." { … }`) implies a `region` container with that vendor's theming.
- Container type inference (when no keyword is present): a slug → `region`; otherwise → `group`.

### Edge declaration

```
edge <from> -> <to> [label: "..."]?
```

- `<from>` and `<to>` reference an element by **id** first; if not found, by **label**. Label resolution is best-effort: the first declared element with that label wins.
- Edges may appear at the top level or inside any container.
- The optional attribute block currently understands `label` only.

## Reference

### Node types

| Type | Description |
| --- | --- |
| `db` | Database (relational, document, KV). Cylindrical icon by default. |
| `actor` | Person or external system that initiates flows. Avatar / user icon. |
| `external` | Third-party system outside your infrastructure. Cloud / globe icon. |
| `s3` | Object storage bucket. Bucket icon. |
| `service` | Internal service, microservice, or app you operate. |
| `addon` | Cloud add-on or sidecar capability (CloudTrail, GuardDuty, Inspector, …). Renders as a chip inside its parent. |
| `node` | Generic untyped node. Used when no other type keyword matches. |

### Container types

| Type | Description |
| --- | --- |
| `region` | Cloud region. Geographic zone (AWS/Azure/GCP). Carries vendor theming. |
| `vpc` | Virtual private cloud / network boundary. |
| `group` | Logical group with no specific cloud meaning. |
| `subnet.public` | Internet-accessible subnet (public ingress / egress). |
| `subnet.private` | Private subnet (no direct public ingress). |

### Cloud slugs

A slug is a vendor optionally followed by one or more `:segment` refinements (e.g. `aws:eu-west-1`, `aws:rds`, `azure:openai`). The full pattern is:

```
^(<vendor>)(:[a-z0-9_-]+)*$
```

| Vendor | Description |
| --- | --- |
| `aws` | Amazon Web Services. Common refinements: aws:eu-west-1, aws:rds, aws:s3, aws:cloudtrail, aws:guardduty, aws:inspector. |
| `azure` | Microsoft Azure. Common refinements: azure:openai, azure:functions. |
| `gcp` | Google Cloud Platform. Common refinements: gcp:gemini, gcp:cloud-run. |
| `github` | GitHub (repos, CI/CD, packages). |
| `cloudflare` | Cloudflare (DNS, WAF, CDN, Workers). |
| `slack` | Slack workspace. |
| `stripe` | Stripe billing / payments. |
| `keycloak` | Keycloak OIDC / SSO. |
| `posthog` | PostHog product analytics. |
| `intercom` | Intercom customer support chat. |
| `tailscale` | Tailscale mesh VPN. |
| `coolify` | Coolify self-hosted PaaS. |
| `nextjs` | Next.js application framework. |
| `redis` | Redis cache / data store. |
| `datadog` | Datadog logs, metrics, traces. |
| `sendgrid` | SendGrid transactional email. |
| `sharepoint` | Microsoft SharePoint. |
| `entra` | Microsoft Entra ID (formerly Azure AD). |
| `ssm` | AWS Systems Manager (parameter store, session manager). |
| `traefik` | Traefik reverse proxy. |
| `oauth2-proxy` | oauth2-proxy authenticating reverse proxy. |
| `hatchet` | Hatchet job queue / workflow engine. |
| `kuma` | Uptime Kuma availability monitoring. |

### Attribute keys

Used inside `[ … ]` blocks attached to declarations and edges. Both `[key:value]` (glued) and `[key: "value"]` (separated) forms are accepted. Multiple attributes are comma-separated.

| Key | Description |
| --- | --- |
| `label` | Display label override. String. e.g. `[label: "My Label"]`. |
| `slug` | Cloud / technology slug for theming + icons. e.g. `[slug: aws:rds]`. |

## Errors

The parser reports a structured `BromaidError` with:

- `message` — human-readable text.
- `code` — stable error code.
- `line`, `col` — source location.
- `hint` — optional "did you mean…?" suggestion.
- `near` — the offending token, if known.

| Code | When |
| --- | --- |
| `BRO_UNEXPECTED_TOKEN` | Got a token that is not allowed at this position. |
| `BRO_UNEXPECTED_EOF` | Source ended mid-statement. |
| `BRO_UNKNOWN_NODE` | An edge references an id/label that was never declared. |
| `BRO_DUPLICATE_ID` | Reserved for future use. |

## Runtime validation

`@bromaid/core` ships Zod schemas for every part of the DSL surface so any AST — whether produced by `parse()` or by an external producer (an MCP tool, an AI assistant, a JSON API) — can be validated at runtime:

```ts
import { ProgramSchema, BromaidNodeSchema, parse } from '@bromaid/core';

const program = parse(source);
ProgramSchema.parse(program);              // throws if malformed

// Or validate hand-built JSON:
BromaidNodeSchema.parse({
  kind: 'node', id: 'lb', type: 'service',
  slug: null, label: 'Load Balancer', sublabel: null,
});
```

Schemas exported from `@bromaid/core`:

- Enums: `KnownNodeKindSchema`, `ContainerKindSchema`, `CloudVendorSchema`, `AttrKeySchema`
- Strings: `CloudSlugSchema` (regex-validated), `NodeKindSchema` (well-known | string)
- AST: `BromaidNodeSchema`, `BromaidContainerSchema`, `BromaidElementSchema`, `BromaidEdgeSchema`, `ProgramSchema`

## Grammar (EBNF, informative)

```ebnf
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
```
