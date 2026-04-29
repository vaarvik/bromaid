/**
 * Public AST types for the bromaid DSL.
 *
 * The full pipeline is `parse -> layout -> renderSVG`. Everything in this file
 * lives at the parse boundary. Nothing here imports a DOM type or browser API,
 * so the parser is safe to import from a React Server Component.
 */

export type ContainerKind =
  | 'region'
  | 'vpc'
  | 'group'
  | 'subnet.public'
  | 'subnet.private';

export type KnownNodeKind =
  | 'db'
  | 'actor'
  | 'external'
  | 's3'
  | 'service'
  | 'addon'
  | 'node';

/**
 * `NodeKind` accepts the well-known node types AND any user-defined string.
 * The `(string & {})` intersection preserves IDE autocomplete on the literals
 * while still accepting custom types like `"queue"` or `"lambda"`.
 */
export type NodeKind = KnownNodeKind | (string & Record<never, never>);

export type CloudVendor =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'github'
  | 'cloudflare'
  | 'slack'
  | 'stripe'
  // Common third-party / technology slugs (used for theming + icons)
  | 'keycloak'
  | 'posthog'
  | 'intercom'
  | 'tailscale'
  | 'coolify'
  | 'nextjs'
  | 'redis'
  | 'datadog'
  | 'sendgrid'
  | 'sharepoint';

/**
 * A cloud slug is either a bare vendor (`aws`) or a colon-namespaced refinement
 * (`aws:s3`, `azure:openai`). The `${vendor}:${string}` template gives us
 * literal-checked autocomplete on common cases without forbidding novel ones.
 */
export type CloudSlug = CloudVendor | `${CloudVendor}:${string}`;

export type BromaidElement = BromaidNode | BromaidContainer;

export interface BromaidNode {
  readonly kind: 'node';
  readonly id: string;
  readonly type: NodeKind;
  readonly slug: CloudSlug | null;
  readonly label: string;
  readonly sublabel: string | null;
}

export interface BromaidContainer {
  readonly kind: 'container';
  readonly id: string;
  readonly type: ContainerKind;
  readonly slug: CloudSlug | null;
  readonly label: string;
  readonly sublabel: string | null;
  readonly children: ReadonlyArray<BromaidElement>;
}

export interface BromaidEdge {
  /** Identifier as it appeared in the source — preserved for error messages. */
  readonly from: string;
  readonly to: string;
  /** Resolved id of the source element after name lookup. */
  readonly fromId: string;
  readonly toId: string;
  readonly label: string | null;
  readonly sourceLine: number;
}

export interface Program {
  /** Synthetic root container holding all top-level declarations. */
  readonly root: BromaidContainer;
  readonly edges: ReadonlyArray<BromaidEdge>;
  /** Lookup table from element id to element. */
  readonly elements: ReadonlyMap<string, BromaidElement>;
}
