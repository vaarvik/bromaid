import { describe, expect, it } from 'vitest';
import { BromaidError, parse } from '../src/index.js';

describe('errors', () => {
  it('throws BromaidError on unknown edge target', () => {
    let caught: unknown = null;
    try {
      parse(`actor a "A"
edge a -> ghost`);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BromaidError);
    if (!(caught instanceof BromaidError)) return;
    expect(caught.code).toBe('BRO_UNKNOWN_NODE');
    expect(caught.line).toBe(2);
    expect(caught.near).toBe('ghost');
  });

  it('suggests a near match when one exists', () => {
    let caught: unknown = null;
    try {
      parse(`actor developer "Dev"
edge developr -> developer`);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BromaidError);
    if (!(caught instanceof BromaidError)) return;
    expect(caught.hint).toMatch(/developer/);
  });

  it('throws on unbalanced braces', () => {
    expect(() => parse('region "EU" {\n  foo "Foo"')).toThrow(BromaidError);
  });

  it('formats line numbers in the message', () => {
    let caught: unknown = null;
    try {
      parse(`actor a "A"
edge a -> nope`);
    } catch (err) {
      caught = err;
    }
    expect(String(caught)).toMatch(/Line 2/);
  });
});
