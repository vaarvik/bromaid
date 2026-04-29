/**
 * Deterministic text measurement and wrapping shared by the layout pass and
 * the SVG renderer. We have no access to real font metrics in either
 * context, so we approximate glyph widths from a hand-tuned table calibrated
 * against the default sans-serif stack used by `@bromaid/renderer`. Both
 * layers must measure the same way for box sizing to match what gets drawn.
 */

/**
 * Per-glyph advance widths as a fraction of the font's `font-size` (em),
 * calibrated against Helvetica/Arial which are within a few percent of the
 * Apple SF Pro / Segoe UI / system-ui stack used by the renderer.
 */
const GLYPH_EM: Readonly<Record<string, number>> = {
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, $: 0.556, '%': 0.889,
  '&': 0.667, "'": 0.222, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278,
  '0': 0.556, '1': 0.556, '2': 0.556, '3': 0.556, '4': 0.556,
  '5': 0.556, '6': 0.556, '7': 0.556, '8': 0.556, '9': 0.556,
  ':': 0.278, ';': 0.278, '<': 0.584, '=': 0.584, '>': 0.584, '?': 0.556,
  '@': 1.015,
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778,
  H: 0.722, I: 0.278, J: 0.5, K: 0.667, L: 0.556, M: 0.833, N: 0.722,
  O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722,
  V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
  '[': 0.278, '\\': 0.278, ']': 0.278, '^': 0.469, _: 0.556, '`': 0.333,
  a: 0.556, b: 0.556, c: 0.5, d: 0.556, e: 0.556, f: 0.278, g: 0.556,
  h: 0.556, i: 0.222, j: 0.222, k: 0.5, l: 0.222, m: 0.833, n: 0.556,
  o: 0.556, p: 0.556, q: 0.556, r: 0.333, s: 0.5, t: 0.278, u: 0.556,
  v: 0.5, w: 0.722, x: 0.5, y: 0.5, z: 0.5,
  '{': 0.334, '|': 0.26, '}': 0.334, '~': 0.584,
};

/** Fallback for code points not in the table (CJK, emoji, etc.). */
const DEFAULT_GLYPH_EM = 0.6;

export interface MeasureTextOptions {
  /** Extra horizontal advance per glyph pair, in CSS pixels. */
  readonly letterSpacing?: number;
}

/**
 * Approximate the rendered pixel width of a string at a given `fontSize`.
 *
 * Sums per-glyph advance widths from the default sans-serif table, plus an
 * optional `letterSpacing` term applied between every pair of adjacent code
 * points (matching CSS `letter-spacing` semantics). Results are within ~3%
 * of the canvas-measured truth on the system fonts the renderer targets.
 */
export function measureText(
  text: string,
  fontSize: number,
  options: MeasureTextOptions = {},
): number {
  if (text.length === 0 || fontSize <= 0) return 0;
  const ls = options.letterSpacing ?? 0;
  let width = 0;
  let count = 0;
  for (const ch of text) {
    const em = GLYPH_EM[ch] ?? DEFAULT_GLYPH_EM;
    width += em * fontSize;
    count += 1;
  }
  if (count > 1 && ls !== 0) width += (count - 1) * ls;
  return width;
}

export interface WrappedText {
  /** One entry per visual line, in order, with no trailing whitespace. */
  readonly lines: ReadonlyArray<string>;
  /** Width in pixels of the widest line, given `approxCharWidthPx`. */
  readonly width: number;
}

const EMPTY: WrappedText = { lines: [], width: 0 };

/**
 * Function that returns the rendered width of a string in pixels. Callers
 * typically pass a closure over `measureText` bound to a specific font size
 * and letter-spacing.
 */
export type MeasureFn = (text: string) => number;

/** Sub-pixel slack so values that are mathematically equal pass `<=` checks. */
const FIT_EPSILON = 1e-6;

/**
 * Greedy word-wrap. Words wider than `maxWidthPx` are hard-broken across
 * lines so a single huge token cannot overflow its container. Whitespace
 * runs collapse to a single space inside a line.
 */
export function wrapTextToLines(
  text: string,
  maxWidthPx: number,
  measure: MeasureFn,
): WrappedText {
  if (text.length === 0) return EMPTY;
  if (maxWidthPx <= 0) return EMPTY;

  const fits = (s: string): boolean => measure(s) <= maxWidthPx + FIT_EPSILON;

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return EMPTY;

  const lines: string[] = [];
  let current = '';

  const pushCurrent = (): void => {
    if (current.length > 0) {
      lines.push(current);
      current = '';
    }
  };

  const hardBreak = (word: string): void => {
    let buf = '';
    for (const ch of word) {
      if (buf.length > 0 && !fits(buf + ch)) {
        lines.push(buf);
        buf = ch;
      } else {
        buf += ch;
      }
    }
    current = buf;
  };

  for (const word of words) {
    if (!fits(word)) {
      pushCurrent();
      hardBreak(word);
      continue;
    }

    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (!fits(candidate)) {
      pushCurrent();
      current = word;
    } else {
      current = candidate;
    }
  }
  pushCurrent();

  let width = 0;
  for (const line of lines) {
    const w = measure(line);
    if (w > width) width = w;
  }
  return { lines, width };
}
