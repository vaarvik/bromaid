export type BromaidErrorCode =
  | 'BRO_UNEXPECTED_TOKEN'
  | 'BRO_UNEXPECTED_EOF'
  | 'BRO_UNKNOWN_NODE'
  | 'BRO_DUPLICATE_ID';

export interface BromaidErrorOptions {
  readonly code: BromaidErrorCode;
  readonly line: number | null;
  readonly col: number | null;
  readonly hint: string | null;
  readonly near: string | null;
}

export class BromaidError extends Error {
  readonly code: BromaidErrorCode;
  readonly line: number | null;
  readonly col: number | null;
  readonly hint: string | null;
  readonly near: string | null;

  constructor(message: string, opts: BromaidErrorOptions) {
    super(formatMessage(message, opts));
    this.name = 'BromaidError';
    this.code = opts.code;
    this.line = opts.line;
    this.col = opts.col;
    this.hint = opts.hint;
    this.near = opts.near;
  }
}

function formatMessage(message: string, opts: BromaidErrorOptions): string {
  const parts: string[] = [];
  if (opts.line !== null) {
    const loc = opts.col !== null ? `${opts.line}:${opts.col}` : `${opts.line}`;
    parts.push(`Line ${loc}: ${message}`);
  } else {
    parts.push(message);
  }
  if (opts.hint !== null) {
    parts.push(`  Hint: ${opts.hint}`);
  }
  return parts.join('\n');
}
