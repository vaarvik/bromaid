/**
 * Geometric constants for node boxes. Centralized here so the layout pass
 * (which sizes the ELK nodes) and the SVG renderer (which has to draw inside
 * those exact sizes) can agree on padding, line heights, and text widths.
 *
 * All measurements are in CSS pixels.
 */

export const NODE_WIDTH_MIN = 120;
export const NODE_WIDTH_MAX = 220;

export const SLUG_BADGE_WIDTH = 28;

/** Distance from the node's left edge to the start of the text column. */
export const NODE_TEXT_LEFT_PAD = 38;
/**
 * Right-edge padding inside the node so wrapped text never touches the border.
 * Generous on purpose: the per-character width below is an approximation, so
 * a 4–6px safety margin here protects against under-estimates for wide glyphs
 * like `M` or `W`.
 */
export const NODE_TEXT_RIGHT_PAD = 16;
/** Top + bottom padding inside the node around the text block. */
export const NODE_TEXT_VERTICAL_PAD = 10;
/** Vertical gap between the wrapped label block and the sublabel block. */
export const NODE_LABEL_SUBLABEL_GAP = 1;

/** Vertical advance per text line. */
export const NODE_LABEL_LINE_H = 15;
export const NODE_SUBLABEL_LINE_H = 13;
