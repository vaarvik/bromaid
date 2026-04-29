import type { CloudSlug, ContainerKind, NodeKind } from '@bromaid/core';

export type RenderMode = 'light' | 'dark';

export interface SlugIconPath {
  readonly d: string;
  readonly fillRule?: 'nonzero' | 'evenodd';
}

export interface SlugIcon {
  /** The icon's SVG viewBox, typically `"0 0 24 24"`. */
  readonly viewBox: string;
  /** One or more SVG paths to render (monochrome). */
  readonly paths: ReadonlyArray<SlugIconPath>;
}

export interface SlugTheme {
  /** CSS color value used for accents (border, badge, label background). */
  readonly color: string;
  /** Short label rendered inside the slug badge. */
  readonly label: string;
  /** Optional monochrome icon rendered in the slug badge/header. */
  readonly icon?: SlugIcon;
}

export interface ContainerTheme {
  readonly fill: string;
  readonly stroke: string;
  readonly dashed: boolean;
}

export interface NodeTypeTheme {
  /** CSS color value used as the accent stripe / left border. */
  readonly color: string;
}

/** Surface colors are mode-dependent (light vs dark). */
export interface Surface {
  readonly bg: string;
  readonly bg2: string;
  readonly bg3: string;
  readonly fg: string;
  readonly fgDim: string;
  readonly fgFaint: string;
  readonly border: string;
  readonly borderStrong: string;
}

export interface ModeSurface {
  readonly light: Surface;
  readonly dark: Surface;
}

export interface Theme {
  /** Slug → palette. Resolution walks from longest match to shortest. */
  readonly slugs: ReadonlyMap<CloudSlug | string, SlugTheme>;
  /** Container kind → fill/stroke. */
  readonly containers: ReadonlyMap<ContainerKind, ContainerTheme>;
  /** Node type → accent color. */
  readonly nodeTypes: ReadonlyMap<NodeKind, NodeTypeTheme>;
  /** Surface palette per render mode. */
  readonly surface: ModeSurface;
}

export interface ThemeOverrides {
  readonly slugs?: Partial<Record<string, SlugTheme>>;
  readonly containers?: Partial<Record<ContainerKind, ContainerTheme>>;
  readonly nodeTypes?: Partial<Record<NodeKind, NodeTypeTheme>>;
  readonly surface?: {
    readonly light?: Partial<Surface>;
    readonly dark?: Partial<Surface>;
  };
}
