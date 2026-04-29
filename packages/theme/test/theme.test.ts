import { describe, expect, it } from 'vitest';
import {
  defaultTheme,
  defineTheme,
  mergeTheme,
  resolveNodeAccent,
  resolveSlugTheme,
} from '../src/index.js';
import type { BromaidNode } from '@bromaid/core';

describe('theme resolution', () => {
  it('resolves an exact slug match', () => {
    const hit = resolveSlugTheme(defaultTheme, 'aws:s3');
    expect(hit?.label).toBe('S3');
  });

  it('falls back to vendor when sub-slug is unknown', () => {
    const hit = resolveSlugTheme(defaultTheme, 'aws:dynamodb');
    expect(hit?.label).toBe('AWS');
  });

  it('returns null for null slug', () => {
    expect(resolveSlugTheme(defaultTheme, null)).toBeNull();
  });

  it('returns null for unknown vendor', () => {
    expect(resolveSlugTheme(defaultTheme, 'cloudflare:wat')).not.toBeNull();
    expect(resolveSlugTheme(defaultTheme, 'aws:s3')).not.toBeNull();
  });
});

describe('node accent resolution', () => {
  it('prefers slug palette over node-type palette', () => {
    const node: BromaidNode = {
      kind: 'node',
      id: 'n',
      type: 'db',
      slug: 'aws:s3',
      label: 'X',
      sublabel: null,
    };
    expect(resolveNodeAccent(defaultTheme, node)).toBe('#7AA116');
  });

  it('falls back to node-type palette when slug is null', () => {
    const node: BromaidNode = {
      kind: 'node',
      id: 'n',
      type: 'db',
      slug: null,
      label: 'X',
      sublabel: null,
    };
    expect(resolveNodeAccent(defaultTheme, node)).toBe('#9b59b6');
  });
});

describe('mergeTheme', () => {
  it('adds a new slug while preserving existing ones', () => {
    const merged = mergeTheme(defaultTheme, {
      slugs: { 'mycorp:thing': { color: '#abcdef', label: 'MC' } },
    });
    expect(merged.slugs.get('mycorp:thing')?.color).toBe('#abcdef');
    expect(merged.slugs.get('aws:s3')?.label).toBe('S3');
  });

  it('overrides an existing slug', () => {
    const merged = mergeTheme(defaultTheme, {
      slugs: { aws: { color: '#000000', label: 'AMZN' } },
    });
    expect(merged.slugs.get('aws')?.label).toBe('AMZN');
  });

  it('overrides surface colors per mode', () => {
    const merged = mergeTheme(defaultTheme, {
      surface: { dark: { bg: '#111111' } },
    });
    expect(merged.surface.dark.bg).toBe('#111111');
    expect(merged.surface.light.bg).toBe(defaultTheme.surface.light.bg);
  });
});

describe('defineTheme', () => {
  it('accepts plain objects and converts to Maps', () => {
    const t = defineTheme({
      slugs: { foo: { color: '#fff', label: 'F' } },
      surface: defaultTheme.surface,
    });
    expect(t.slugs.get('foo')?.label).toBe('F');
  });
});
