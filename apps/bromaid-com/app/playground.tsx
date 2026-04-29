'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RenderMode = 'dark' | 'light';

type RenderOk = {
  readonly ok: true;
  readonly svg: string;
};

type RenderErr = {
  readonly ok: false;
  readonly error: string;
};

type RenderResponse = RenderOk | RenderErr;

async function renderOnServer(args: {
  readonly source: string;
  readonly mode: RenderMode;
  readonly background: 'surface' | null;
}): Promise<RenderResponse> {
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });

  const text = await res.text();
  // Keep response handling strict without trusting JSON blindly.
  try {
    const parsed = JSON.parse(text) as { ok: boolean; svg?: string; error?: string };
    if (parsed.ok === true && typeof parsed.svg === 'string') return { ok: true, svg: parsed.svg };
    if (parsed.ok === false && typeof parsed.error === 'string')
      return { ok: false, error: parsed.error };
    return { ok: false, error: 'Invalid response from server.' };
  } catch {
    return { ok: false, error: res.ok ? 'Invalid JSON from server.' : text || res.statusText };
  }
}

export default function Playground({ defaultSource }: { defaultSource: string }) {
  const [source, setSource] = useState(defaultSource);
  const [mode, setMode] = useState<RenderMode>('dark');
  const [background, setBackground] = useState<'surface' | null>('surface');

  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);

  const debounced = useRef<number | null>(null);
  const canRender = useMemo(() => source.trim().length > 0, [source]);

  useEffect(() => {
    if (!canRender) {
      setSvg('');
      setError('Source is empty.');
      return;
    }

    if (debounced.current !== null) window.clearTimeout(debounced.current);
    debounced.current = window.setTimeout(() => {
      void (async () => {
        setIsRendering(true);
        const out = await renderOnServer({ source, mode, background });
        setIsRendering(false);
        if (out.ok) {
          setSvg(out.svg);
          setError('');
        } else {
          setSvg('');
          setError(out.error);
        }
      })();
    }, 250);

    return () => {
      if (debounced.current !== null) window.clearTimeout(debounced.current);
    };
  }, [source, mode, background, canRender]);

  return (
    <main style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(9,13,20,0.75)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <div style={{ fontWeight: 650, letterSpacing: 0.2 }}>bromaid</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>playground</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ opacity: 0.7 }}>Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as RenderMode)}
              style={{
                background: '#121a2a',
                color: '#e7edf7',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 4,
                padding: '6px 10px',
              }}
            >
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ opacity: 0.7 }}>Background</span>
            <select
              value={background === null ? 'transparent' : 'surface'}
              onChange={(e) => setBackground(e.target.value === 'transparent' ? null : 'surface')}
              style={{
                background: '#121a2a',
                color: '#e7edf7',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 4,
                padding: '6px 10px',
              }}
            >
              <option value="surface">surface</option>
              <option value="transparent">transparent</option>
            </select>
          </label>

          <div style={{ fontSize: 13, opacity: 0.7 }}>
            {isRendering ? 'Rendering…' : error ? 'Error' : 'OK'}
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 1fr) 1.3fr',
          gap: 12,
          padding: 12,
        }}
      >
        <section
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 7,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>Editor</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{source.length.toLocaleString()} chars</div>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: 'calc(100vh - 120px)',
              resize: 'none',
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: '#e7edf7',
              padding: 12,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          />
        </section>

        <section
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 7,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>Preview</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {error ? 'Fix the DSL to render' : 'SVG'}
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {error ? (
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 6,
                  background: 'rgba(255, 70, 70, 0.10)',
                  border: '1px solid rgba(255, 70, 70, 0.28)',
                  color: '#ffd2d2',
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </pre>
            ) : (
              <div style={{ width: '100%', overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
