/**
 * Levenshtein distance between two ASCII strings. Used to power "did you mean…?"
 * suggestions when an edge references an unknown node.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    const cur: number[] = new Array<number>(n + 1);
    cur[0] = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      const left = cur[j - 1] ?? 0;
      const up = prev[j] ?? 0;
      const diag = prev[j - 1] ?? 0;
      cur[j] = Math.min(left + 1, up + 1, diag + cost);
    }
    prev = cur;
  }

  return prev[n] ?? 0;
}

/**
 * Pick the closest match in `candidates` to `target`. Returns null if nothing
 * is reasonably close. A substring match wins outright; otherwise we accept up
 * to `max(2, floor(target.length / 3))` edits.
 */
export function closestMatch(
  target: string,
  candidates: readonly string[],
): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  const t = target.toLowerCase();
  const threshold = Math.max(2, Math.floor(t.length / 3));

  for (const c of candidates) {
    const cl = c.toLowerCase();
    if (cl.includes(t) || t.includes(cl)) return c;
    const d = levenshtein(t, cl);
    if (d < bestScore && d <= threshold) {
      best = c;
      bestScore = d;
    }
  }

  return best;
}
