import type { CloudSlug, ContainerKind, NodeKind } from '@bromaid/core';
import type {
  ContainerTheme,
  NodeTypeTheme,
  SlugTheme,
  Surface,
  Theme,
  ThemeOverrides,
} from './types.js';

export interface DefineThemeInput {
  readonly slugs?:
    | ReadonlyMap<CloudSlug | string, SlugTheme>
    | Record<string, SlugTheme>;
  readonly containers?:
    | ReadonlyMap<ContainerKind, ContainerTheme>
    | Partial<Record<ContainerKind, ContainerTheme>>;
  readonly nodeTypes?:
    | ReadonlyMap<NodeKind, NodeTypeTheme>
    | Partial<Record<NodeKind, NodeTypeTheme>>;
  readonly surface: { readonly light: Surface; readonly dark: Surface };
}

export function defineTheme(input: DefineThemeInput): Theme {
  return {
    slugs: toMap<string, SlugTheme>(input.slugs ?? {}),
    containers: toMap<ContainerKind, ContainerTheme>(input.containers ?? {}),
    nodeTypes: toMap<NodeKind, NodeTypeTheme>(input.nodeTypes ?? {}),
    surface: input.surface,
  };
}

export function mergeTheme(base: Theme, overrides: ThemeOverrides): Theme {
  return {
    slugs: mergeMap<string, SlugTheme>(base.slugs, overrides.slugs ?? {}),
    containers: mergeMap<ContainerKind, ContainerTheme>(
      base.containers,
      overrides.containers ?? {},
    ),
    nodeTypes: mergeMap<NodeKind, NodeTypeTheme>(
      base.nodeTypes,
      overrides.nodeTypes ?? {},
    ),
    surface: {
      light: { ...base.surface.light, ...(overrides.surface?.light ?? {}) },
      dark: { ...base.surface.dark, ...(overrides.surface?.dark ?? {}) },
    },
  };
}

function toMap<K extends string, V>(
  input: ReadonlyMap<K, V> | Partial<Record<K, V>>,
): ReadonlyMap<K, V> {
  if (input instanceof Map) return input;
  const out = new Map<K, V>();
  for (const key of Object.keys(input)) {
    const v = (input as Partial<Record<string, V>>)[key];
    if (v !== undefined) out.set(key as K, v);
  }
  return out;
}

function mergeMap<K extends string, V>(
  base: ReadonlyMap<K, V>,
  overrides: ReadonlyMap<K, V> | Partial<Record<K, V>>,
): ReadonlyMap<K, V> {
  const out = new Map<K, V>(base);
  if (overrides instanceof Map) {
    for (const [k, v] of overrides) out.set(k, v);
    return out;
  }
  for (const key of Object.keys(overrides)) {
    const v = (overrides as Partial<Record<string, V>>)[key];
    if (v !== undefined) out.set(key as K, v);
  }
  return out;
}
