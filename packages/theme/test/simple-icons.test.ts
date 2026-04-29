import { describe, expect, it } from 'vitest';
import { defaultTheme, resolveSlugTheme } from '../src/index.js';

function expectHasIcon(slug: string): void {
  const hit = resolveSlugTheme(defaultTheme, slug);
  expect(hit, `expected slug theme for "${slug}"`).not.toBeNull();
  expect(hit?.icon, `expected icon for "${slug}"`).toBeDefined();
  expect(hit?.icon?.viewBox.length ?? 0).toBeGreaterThan(0);
  expect(hit?.icon?.paths.length ?? 0).toBeGreaterThan(0);
  expect(hit?.icon?.paths[0]?.d.length ?? 0).toBeGreaterThan(0);
}

describe('default theme icons', () => {
  it('includes generated icons for common slugs', () => {
    expectHasIcon('github');
    expectHasIcon('cloudflare');
    expectHasIcon('gcp');
    expectHasIcon('keycloak');
    expectHasIcon('posthog');
    expectHasIcon('intercom');
    expectHasIcon('tailscale');
  });

  it('includes bespoke icons for slugs missing in simple-icons', () => {
    expectHasIcon('slack');
    expectHasIcon('sharepoint');
    expectHasIcon('aws');
    expectHasIcon('azure');
  });
});

