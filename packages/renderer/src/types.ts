import type { RenderMode, Theme } from '@bromaid/theme';

export type { RenderMode };

export interface RenderOptions {
  /** Theme to use. Defaults to `defaultTheme` from `@bromaid/theme`. */
  readonly theme?: Theme;
  /** Color mode. Defaults to `'dark'`. */
  readonly mode?: RenderMode;
  /** Custom font-family applied at the SVG level. Defaults to system stack. */
  readonly fontFamily?: string;
  /**
   * Background fill behind the diagram. `null` = transparent (default), useful
   * when embedding inline. Pass `'surface'` to fill with the theme's `bg`.
   */
  readonly background?: string | 'surface' | null;
}
