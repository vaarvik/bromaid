import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, type BromaidElement } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, '../../../examples');

async function loadExample(name: string): Promise<string> {
  return readFile(resolve(examples, `${name}.bro`), 'utf8');
}

describe('parse', () => {
  it('parses an empty source', () => {
    const program = parse('');
    expect(program.root.children).toHaveLength(0);
    expect(program.edges).toHaveLength(0);
  });

  it('parses a single bare node', () => {
    const program = parse('foo "Foo"');
    expect(program.root.children).toHaveLength(1);
    const [first] = program.root.children;
    expect(first?.kind).toBe('node');
    expect(first?.id).toBe('foo');
    expect(first?.label).toBe('Foo');
    expect(first?.type).toBe('node');
  });

  it('treats two strings as label + sublabel', () => {
    const program = parse('actor dev "Developer" "Tailscale"');
    const [first] = program.root.children;
    expect(first?.label).toBe('Developer');
    expect(first?.sublabel).toBe('Tailscale');
    expect(first?.type).toBe('actor');
  });

  it('ignores comments and blank lines', () => {
    const program = parse(`
# top comment
foo "Foo"   # trailing
# another
bar "Bar"
`);
    expect(program.root.children).toHaveLength(2);
  });

  it('records cloud slugs on nodes', () => {
    const program = parse('aws:s3 mybucket "My bucket"');
    const [first] = program.root.children;
    expect(first?.slug).toBe('aws:s3');
  });

  it('treats a cloud slug at the top of a container as a region', () => {
    const program = parse(`region aws:eu-west-1 "EU" {
  foo "Foo"
}`);
    const [first] = program.root.children;
    expect(first?.kind).toBe('container');
    if (first?.kind !== 'container') return;
    expect(first.type).toBe('region');
    expect(first.slug).toBe('aws:eu-west-1');
    expect(first.children).toHaveLength(1);
  });

  it('preserves subnet container types', () => {
    const program = parse(`vpc "VPC" {
  subnet.public "Public" {
    foo "Foo"
  }
  subnet.private "Private" {
    bar "Bar"
  }
}`);
    const vpc = program.root.children[0];
    expect(vpc?.kind).toBe('container');
    if (vpc?.kind !== 'container') return;
    expect(vpc.children[0]?.kind === 'container' && vpc.children[0].type).toBe(
      'subnet.public',
    );
    expect(vpc.children[1]?.kind === 'container' && vpc.children[1].type).toBe(
      'subnet.private',
    );
  });

  it('parses edge declarations with labels', () => {
    const program = parse(`actor a "A"
actor b "B"
edge a -> b [label: hello]`);
    expect(program.edges).toHaveLength(1);
    expect(program.edges[0]?.fromId).toBe('a');
    expect(program.edges[0]?.toId).toBe('b');
    expect(program.edges[0]?.label).toBe('hello');
  });

  it('parses all bundled examples without throwing', async () => {
    for (const name of ['simple', 'micro', 'full'] as const) {
      const source = await loadExample(name);
      expect(() => parse(source)).not.toThrow();
    }
  });

  it('produces the expected counts for examples/full.bro', async () => {
    const source = await loadExample('full');
    const program = parse(source);
    let nodeCount = 0;
    const walk = (children: ReadonlyArray<BromaidElement>): void => {
      for (const c of children) {
        if (c.kind === 'node') nodeCount++;
        else walk(c.children);
      }
    };
    walk(program.root.children);
    expect(nodeCount).toBeGreaterThan(15);
    expect(program.edges.length).toBeGreaterThanOrEqual(15);
  });

  it('elements lookup contains every declared id', () => {
    const program = parse(`actor a "A"
region aws:eu "EU" {
  foo "Foo"
}`);
    expect(program.elements.has('a')).toBe(true);
    expect(program.elements.has('foo')).toBe(true);
    expect([...program.elements.keys()]).toContain('a');
  });
});
