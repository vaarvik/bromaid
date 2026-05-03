'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Group,
  type Layout,
  Panel,
  type PanelSize,
  Separator,
  useGroupRef,
  usePanelRef,
} from 'react-resizable-panels';

import { SyntaxEditor } from './_components/syntax-editor';
import { useAnalytics } from './_lib/consent';

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

const LAYOUT_STORAGE_KEY = 'bromaid:playground:layout';

function isLayout(value: Record<string, number | string | boolean | null>): value is Layout {
  for (const v of Object.values(value)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return true;
}

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

  const analytics = useAnalytics();

  const editorPanel = usePanelRef();
  const previewPanel = usePanelRef();
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const toggleEditor = useCallback(() => {
    const handle = editorPanel.current;
    if (handle === null) return;
    if (handle.isCollapsed()) handle.expand();
    else handle.collapse();
  }, [editorPanel]);

  const togglePreview = useCallback(() => {
    const handle = previewPanel.current;
    if (handle === null) return;
    if (handle.isCollapsed()) handle.expand();
    else handle.collapse();
  }, [previewPanel]);

  const onEditorResize = useCallback((size: PanelSize) => {
    setEditorCollapsed(size.asPercentage <= 0.5);
  }, []);

  const onPreviewResize = useCallback((size: PanelSize) => {
    setPreviewCollapsed(size.asPercentage <= 0.5);
  }, []);

  const groupRef = useGroupRef();

  useEffect(() => {
    const handle = groupRef.current;
    if (handle === null) return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw) as Record<string, number | string | boolean | null>;
      if (parsed === null || typeof parsed !== 'object') return;
      if (!isLayout(parsed)) return;
      handle.setLayout(parsed);
    } catch {
      // Ignore corrupted persisted layout.
    }
  }, [groupRef]);

  const onLayoutChanged = useCallback((layout: Layout) => {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Storage may be unavailable (e.g. private mode); persistence is best-effort.
    }
  }, []);

  useEffect(() => {
    if (!canRender) {
      setSvg('');
      setError('Source is empty.');
      return;
    }

    if (debounced.current !== null) window.clearTimeout(debounced.current);
    debounced.current = window.setTimeout(() => {
      void (async () => {
        const backgroundLabel = background === null ? 'transparent' : 'surface';
        const sourceLength = source.length;
        setIsRendering(true);
        analytics.track('render_started', {
          mode,
          background: backgroundLabel,
          sourceLength,
        });
        const startedAt = performance.now();
        const out = await renderOnServer({ source, mode, background });
        const durationMs = Math.round(performance.now() - startedAt);
        setIsRendering(false);
        if (out.ok) {
          setSvg(out.svg);
          setError('');
          analytics.track('render_succeeded', {
            mode,
            background: backgroundLabel,
            sourceLength,
            durationMs,
            svgLength: out.svg.length,
          });
        } else {
          setSvg('');
          setError(out.error);
          analytics.track('render_failed', {
            mode,
            background: backgroundLabel,
            sourceLength,
            durationMs,
            error: out.error,
          });
        }
      })();
    }, 250);

    return () => {
      if (debounced.current !== null) window.clearTimeout(debounced.current);
    };
  }, [source, mode, background, canRender, analytics]);

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .bromaid-sep {
          width: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: col-resize;
          position: relative;
          background: transparent;
          transition: background 120ms ease;
        }
        .bromaid-sep::before {
          content: '';
          position: absolute;
          top: 8px; bottom: 8px; left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.10);
          border-radius: 2px;
          transition: background 120ms ease, width 120ms ease;
        }
        .bromaid-sep:hover::before,
        .bromaid-sep:active::before {
          background: rgba(120,170,255,0.55);
          width: 3px;
        }
        .bromaid-sep-grip {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 6px 4px;
          border-radius: 5px;
          background: rgba(20,28,42,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          opacity: 0;
          transition: opacity 120ms ease;
          pointer-events: none;
        }
        .bromaid-sep:hover .bromaid-sep-grip,
        .bromaid-sep:active .bromaid-sep-grip {
          opacity: 1;
        }
        .bromaid-sep-grip i {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.65);
          display: block;
        }
        .bromaid-collapse-btn {
          background: transparent;
          color: #e7edf7;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.75;
          transition: opacity 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .bromaid-collapse-btn:hover {
          opacity: 1;
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.28);
        }
        .bromaid-rail {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 56px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 8px;
          background: rgba(20,28,42,0.92);
          color: #e7edf7;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          padding: 0;
          font-size: 16px;
          transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .bromaid-rail:hover {
          background: rgba(30,42,62,0.98);
          border-color: rgba(120,170,255,0.45);
        }
        .bromaid-rail span {
          opacity: 0.85;
        }
      `}</style>
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
          flex: '0 0 auto',
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
              onChange={(e) => {
                const next = e.target.value as RenderMode;
                setMode(next);
                analytics.track('mode_changed', { mode: next });
              }}
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
              onChange={(e) => {
                const next = e.target.value === 'transparent' ? null : 'surface';
                setBackground(next);
                analytics.track('background_changed', {
                  background: next === null ? 'transparent' : 'surface',
                });
              }}
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

          <Link
            href="/privacy"
            style={{
              fontSize: 12,
              opacity: 0.6,
              color: 'inherit',
              textDecoration: 'none',
              borderLeft: '1px solid rgba(255,255,255,0.14)',
              paddingLeft: 12,
            }}
          >
            Privacy
          </Link>
        </div>
      </header>

      <div style={{ flex: '1 1 auto', minHeight: 0, padding: 12, position: 'relative' }}>
        {editorCollapsed ? (
          <ExpandRail side="left" name="Editor" onClick={toggleEditor} />
        ) : null}
        {previewCollapsed ? (
          <ExpandRail side="right" name="Preview" onClick={togglePreview} />
        ) : null}
        <Group
          orientation="horizontal"
          id="bromaid:playground:layout"
          groupRef={groupRef}
          onLayoutChanged={onLayoutChanged}
          style={{ height: '100%' }}
        >
          <Panel
            panelRef={editorPanel}
            id="editor"
            defaultSize={45}
            minSize={20}
            collapsible
            collapsedSize={0}
            onResize={onEditorResize}
          >
            <PaneShell
              title="Editor"
              meta={`${source.length.toLocaleString()} chars`}
              collapsed={editorCollapsed}
              onToggle={toggleEditor}
              side="left"
            >
              <SyntaxEditor value={source} onChange={setSource} />
            </PaneShell>
          </Panel>

          <Separator id="editor-preview" className="bromaid-sep">
            <div className="bromaid-sep-grip" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </Separator>

          <Panel
            panelRef={previewPanel}
            id="preview"
            defaultSize={55}
            minSize={20}
            collapsible
            collapsedSize={0}
            onResize={onPreviewResize}
          >
            <PaneShell
              title="Preview"
              meta={error ? 'Fix the DSL to render' : 'SVG'}
              collapsed={previewCollapsed}
              onToggle={togglePreview}
              side="right"
            >
              <div style={{ height: '100%', overflow: 'auto', padding: 12, boxSizing: 'border-box' }}>
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
                  <div
                    style={{ width: '100%' }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                )}
              </div>
            </PaneShell>
          </Panel>
        </Group>
      </div>
    </main>
  );
}

function PaneShell({
  title,
  meta,
  collapsed,
  onToggle,
  side,
  children,
}: {
  readonly title: string;
  readonly meta: string;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly side: 'left' | 'right';
  readonly children: React.ReactNode;
}) {
  if (collapsed) return null;

  const collapseGlyph = side === 'left' ? '«' : '»';

  return (
    <section
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
          flex: '0 0 auto',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {side === 'left' ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={`Collapse ${title}`}
              title={`Collapse ${title}`}
              className="bromaid-collapse-btn"
            >
              {collapseGlyph}
            </button>
          ) : null}
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{meta}</div>
          {side === 'right' ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={`Collapse ${title}`}
              title={`Collapse ${title}`}
              className="bromaid-collapse-btn"
            >
              {collapseGlyph}
            </button>
          ) : null}
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>{children}</div>
    </section>
  );
}

function ExpandRail({
  side,
  name,
  onClick,
}: {
  readonly side: 'left' | 'right';
  readonly name: string;
  readonly onClick: () => void;
}) {
  const glyph = side === 'left' ? '›' : '‹';
  const label = `Show ${name}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="bromaid-rail"
      style={{ [side]: 12 } as React.CSSProperties}
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
