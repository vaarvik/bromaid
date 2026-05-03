import type { RenderMode } from '@bromaid/renderer';

type Background = 'surface' | 'transparent';

/**
 * Strongly-typed catalogue of analytics events for bromaid.com.
 *
 * Adding a new event means:
 *   1. Add an entry to `EventMap` below.
 *   2. The compiler will then enforce that every `track(name, props)`
 *      call sites pass the right shape.
 */
export type EventMap = {
  readonly render_started: {
    readonly mode: RenderMode;
    readonly background: Background;
    readonly sourceLength: number;
  };
  readonly render_succeeded: {
    readonly mode: RenderMode;
    readonly background: Background;
    readonly sourceLength: number;
    readonly durationMs: number;
    readonly svgLength: number;
  };
  readonly render_failed: {
    readonly mode: RenderMode;
    readonly background: Background;
    readonly sourceLength: number;
    readonly durationMs: number;
    readonly error: string;
  };
  readonly mode_changed: {
    readonly mode: RenderMode;
  };
  readonly background_changed: {
    readonly background: Background;
  };
  readonly consent_granted: Record<string, never>;
  readonly consent_revoked: Record<string, never>;
};

export type EventName = keyof EventMap;
export type EventProperties<K extends EventName> = EventMap[K];
