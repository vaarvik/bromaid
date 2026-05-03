/**
 * Single source of truth for the bromaid DSL surface.
 *
 * Drives:
 * - parser validation (KNOWN_NODE_KINDS, CONTAINER_KINDS, CLOUD_SLUG_RE, …)
 * - syntax highlighting (same lists, no drift)
 * - runtime AST validation (BromaidNodeSchema, ProgramSchema, …)
 * - the published spec (`scripts/gen-spec.ts` reads the *_META descriptions)
 *
 * Every enum entry has a description so `scripts/gen-spec.ts` can render a
 * human- and AI-readable reference table without ever leaving this file.
 */
import { z } from 'zod';

import type {
  BromaidContainer,
  BromaidEdge,
  BromaidElement,
  BromaidNode,
  CloudSlug,
  Program,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Node types
// ─────────────────────────────────────────────────────────────────────────────

export const KnownNodeKindSchema = z
  .enum(['db', 'actor', 'external', 's3', 'service', 'addon', 'node'])
  .describe('Built-in leaf node type. Drives default icon + theme.');

export const KNOWN_NODE_KINDS = KnownNodeKindSchema.options;

export const NODE_TYPE_META: Record<(typeof KNOWN_NODE_KINDS)[number], string> =
  {
    db: 'Database (relational, document, KV). Cylindrical icon by default.',
    actor:
      'Person or external system that initiates flows. Avatar / user icon.',
    external:
      'Third-party system outside your infrastructure. Cloud / globe icon.',
    s3: 'Object storage bucket. Bucket icon.',
    service: 'Internal service, microservice, or app you operate.',
    addon:
      'Cloud add-on or sidecar capability (CloudTrail, GuardDuty, Inspector, …). Renders as a chip inside its parent.',
    node: 'Generic untyped node. Used when no other type keyword matches.',
  };

/**
 * `NodeKind` accepts any of the well-known kinds AND any user-defined string
 * (e.g. `lb`, `gateway`, `queue`). The runtime schema mirrors that.
 */
export const NodeKindSchema = z
  .union([KnownNodeKindSchema, z.string()])
  .describe(
    'Node type. Either a built-in kind or any user-defined identifier.',
  );

// ─────────────────────────────────────────────────────────────────────────────
// Container types
// ─────────────────────────────────────────────────────────────────────────────

export const ContainerKindSchema = z
  .enum(['region', 'vpc', 'group', 'subnet.public', 'subnet.private'])
  .describe('Container type. Determines layout + visual treatment.');

export const CONTAINER_KINDS = ContainerKindSchema.options;

export const CONTAINER_KIND_META: Record<
  (typeof CONTAINER_KINDS)[number],
  string
> = {
  region:
    'Cloud region. Geographic zone (AWS/Azure/GCP). Carries vendor theming.',
  vpc: 'Virtual private cloud / network boundary.',
  group: 'Logical group with no specific cloud meaning.',
  'subnet.public': 'Internet-accessible subnet (public ingress / egress).',
  'subnet.private': 'Private subnet (no direct public ingress).',
};

/**
 * The keywords `region`, `vpc`, `group` are what the parser recognises as
 * "this is a container, not a node, even before we see `{`". `subnet.public`
 * and `subnet.private` follow a different code path (dotted ids that always
 * imply a container) and are intentionally not in this set.
 */
export const CONTAINER_KEYWORDS: ReadonlySet<string> = new Set<string>([
  'region',
  'vpc',
  'group',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Cloud / technology slugs
// ─────────────────────────────────────────────────────────────────────────────

export const CloudVendorSchema = z
  .enum([
    'aws',
    'azure',
    'gcp',
    'github',
    'cloudflare',
    'slack',
    'stripe',
    'keycloak',
    'posthog',
    'intercom',
    'tailscale',
    'coolify',
    'nextjs',
    'redis',
    'datadog',
    'sendgrid',
    'sharepoint',
    'entra',
    'ssm',
    'traefik',
    'oauth2-proxy',
    'hatchet',
    'kuma',
  ])
  .describe(
    'Cloud or technology slug prefix. Drives palette + icon. May be refined with `:` (e.g. `aws:rds`, `aws:eu-west-1`).',
  );

export const CLOUD_VENDORS = CloudVendorSchema.options;

export const CLOUD_VENDOR_META: Record<(typeof CLOUD_VENDORS)[number], string> =
  {
    aws: 'Amazon Web Services. Common refinements: aws:eu-west-1, aws:rds, aws:s3, aws:cloudtrail, aws:guardduty, aws:inspector.',
    azure:
      'Microsoft Azure. Common refinements: azure:openai, azure:functions.',
    gcp: 'Google Cloud Platform. Common refinements: gcp:gemini, gcp:cloud-run.',
    github: 'GitHub (repos, CI/CD, packages).',
    cloudflare: 'Cloudflare (DNS, WAF, CDN, Workers).',
    slack: 'Slack workspace.',
    stripe: 'Stripe billing / payments.',
    keycloak: 'Keycloak OIDC / SSO.',
    posthog: 'PostHog product analytics.',
    intercom: 'Intercom customer support chat.',
    tailscale: 'Tailscale mesh VPN.',
    coolify: 'Coolify self-hosted PaaS.',
    nextjs: 'Next.js application framework.',
    redis: 'Redis cache / data store.',
    datadog: 'Datadog logs, metrics, traces.',
    sendgrid: 'SendGrid transactional email.',
    sharepoint: 'Microsoft SharePoint.',
    entra: 'Microsoft Entra ID (formerly Azure AD).',
    ssm: 'AWS Systems Manager (parameter store, session manager).',
    traefik: 'Traefik reverse proxy.',
    'oauth2-proxy': 'oauth2-proxy authenticating reverse proxy.',
    hatchet: 'Hatchet job queue / workflow engine.',
    kuma: 'Uptime Kuma availability monitoring.',
  };

const VENDOR_ALT = CLOUD_VENDORS.map((v) =>
  v.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
).join('|');

/**
 * A cloud slug is a vendor optionally followed by one or more `:segment`
 * refinements. Built from `CLOUD_VENDORS` so adding a vendor above auto-updates
 * the regex (and therefore the parser, syntax editor, and spec).
 */
export const CLOUD_SLUG_RE = new RegExp(`^(${VENDOR_ALT})(:[a-z0-9_-]+)*$`);

export const CloudSlugSchema = z
  .custom<CloudSlug>(
    (val) => typeof val === 'string' && CLOUD_SLUG_RE.test(val.toLowerCase()),
    { message: 'Not a recognised cloud slug.' },
  )
  .describe(
    'Vendor or `vendor:refinement` slug — e.g. `aws`, `aws:rds`, `aws:eu-west-1`, `azure:openai`.',
  );

export function isCloudSlug(s: string): s is CloudSlug {
  return CLOUD_SLUG_RE.test(s.toLowerCase());
}

/**
 * True for any token the parser may treat as a "type position": container
 * keyword, known node kind, or any cloud slug. The syntax editor uses this
 * to colour bare identifiers as types.
 */
export function isKnownTypeKeyword(s: string): boolean {
  if (s.length === 0) return false;
  const lower = s.toLowerCase();
  if ((KNOWN_NODE_KINDS as readonly string[]).includes(lower)) return true;
  if ((CONTAINER_KINDS as readonly string[]).includes(lower)) return true;
  if (CLOUD_SLUG_RE.test(lower)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attributes (`[key: value]` blocks)
// ─────────────────────────────────────────────────────────────────────────────

export const AttrKeySchema = z
  .enum(['label', 'slug'])
  .describe('Recognised attribute key inside `[ … ]` blocks.');

export const ATTR_KEYS = AttrKeySchema.options;

export const ATTR_KEY_META: Record<(typeof ATTR_KEYS)[number], string> = {
  label: 'Display label override. String. e.g. `[label: "My Label"]`.',
  slug: 'Cloud / technology slug for theming + icons. e.g. `[slug: aws:rds]`.',
};

// ─────────────────────────────────────────────────────────────────────────────
// AST schemas — runtime validation of parser output (or hand-built ASTs).
//
// Annotated with `z.ZodType<X>` so they validate exactly the public AST types
// from `types.ts`. Inferred output of `.parse()` matches the public types.
// ─────────────────────────────────────────────────────────────────────────────

export const BromaidNodeSchema: z.ZodType<BromaidNode> = z
  .object({
    kind: z.literal('node'),
    id: z.string(),
    type: z.string(),
    slug: CloudSlugSchema.nullable(),
    label: z.string(),
    sublabel: z.string().nullable(),
  })
  .describe('Leaf element. No children.');

export const BromaidElementSchema: z.ZodType<BromaidElement> = z.lazy(() =>
  z.union([BromaidNodeSchema, BromaidContainerSchema]),
);

export const BromaidContainerSchema: z.ZodType<BromaidContainer> = z.lazy(() =>
  z
    .object({
      kind: z.literal('container'),
      id: z.string(),
      type: ContainerKindSchema,
      slug: CloudSlugSchema.nullable(),
      label: z.string(),
      sublabel: z.string().nullable(),
      children: z.array(BromaidElementSchema),
    })
    .describe('Grouping element. Holds nested nodes and containers.'),
);

export const BromaidEdgeSchema: z.ZodType<BromaidEdge> = z
  .object({
    from: z.string().describe('Source name as written in the source.'),
    to: z.string().describe('Target name as written in the source.'),
    fromId: z.string().describe('Resolved source element id.'),
    toId: z.string().describe('Resolved target element id.'),
    label: z.string().nullable(),
    sourceLine: z.number().int().positive(),
  })
  .describe('Connection between two elements.');

export const ProgramSchema: z.ZodType<Program> = z
  .object({
    root: BromaidContainerSchema,
    edges: z.array(BromaidEdgeSchema),
    elements: z.map(z.string(), BromaidElementSchema),
  })
  .describe(
    'Parsed program. Root container holds the tree; edges reference elements by id.',
  );
