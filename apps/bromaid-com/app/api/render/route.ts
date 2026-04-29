import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '@bromaid/renderer';
import type { RenderMode } from '@bromaid/renderer';

type Background = 'surface' | null;

type RenderRequest = {
  readonly source: string;
  readonly mode: RenderMode;
  readonly background: Background;
};

function isRenderMode(value: string): value is RenderMode {
  return value === 'dark' || value === 'light';
}

function parseRenderRequest(text: string): RenderRequest {
  const data = JSON.parse(text) as {
    source?: string;
    mode?: string;
    background?: 'surface' | null | 'transparent';
  };

  if (typeof data.source !== 'string' || data.source.trim().length === 0) {
    throw new Error('`source` must be a non-empty string.');
  }
  if (typeof data.mode !== 'string' || !isRenderMode(data.mode)) {
    throw new Error('`mode` must be `"dark"` or `"light"`.');
  }

  const background =
    data.background === 'transparent' ? null : data.background === 'surface' ? 'surface' : null;

  return { source: data.source, mode: data.mode, background };
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const { source, mode, background } = parseRenderRequest(bodyText);

    const program = parse(source);
    const graph = await layout(program);
    const svg = renderSVG(graph, { mode, background });

    return Response.json({ ok: true, svg } as const);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed.';
    return Response.json({ ok: false, error: message } as const, { status: 400 });
  }
}

