import { describe, expect, test } from 'bun:test';
import type { ClassAncestry } from './extractCssClasses/index.js';
import { rescueUsedAncestors } from './rescueUsedAncestors.js';

const ancestry = (entries: Array<[string, string]>): ClassAncestry =>
  new Map(entries);

describe('rescueUsedAncestors', () => {
  test('single hop: a used child rescues its immediate parent', () => {
    const used = new Set(['--orientation-horizontal']);
    rescueUsedAncestors(
      used,
      ancestry([
        ['--orientation-horizontal', '--orientation'],
        ['--orientation-vertical', '--orientation'],
      ])
    );
    expect(used.has('--orientation')).toBe(true);
    // The unused sibling is NOT pulled in.
    expect(used.has('--orientation-vertical')).toBe(false);
  });

  test('multi hop: a deep leaf rescues every ancestor to the family root', () => {
    const used = new Set(['--color-primary-faded']);
    rescueUsedAncestors(
      used,
      ancestry([
        ['--color-primary', '--color'],
        ['--color-primary-faded', '--color-primary'],
      ])
    );
    expect(used.has('--color-primary')).toBe(true);
    expect(used.has('--color')).toBe(true);
  });

  test('mid-level use rescues ancestors but not deeper orphans', () => {
    const used = new Set(['--color-primary']);
    rescueUsedAncestors(
      used,
      ancestry([
        ['--color-primary', '--color'],
        ['--color-primary-faded', '--color-primary'],
      ])
    );
    expect(used.has('--color')).toBe(true);
    // The deeper leaf has no used descendant, so it stays unused.
    expect(used.has('--color-primary-faded')).toBe(false);
  });

  test('a fully unused branch is never rescued', () => {
    const used = new Set(['unrelated']);
    rescueUsedAncestors(
      used,
      ancestry([
        ['--size-small', '--size'],
        ['--size-large', '--size'],
      ])
    );
    expect(used.has('--size')).toBe(false);
    expect(used.has('--size-small')).toBe(false);
    expect(used.has('--size-large')).toBe(false);
  });

  test('a child whose parent is already used leaves the set unchanged', () => {
    const used = new Set(['--orientation', '--orientation-horizontal']);
    const before = new Set(used);
    rescueUsedAncestors(
      used,
      ancestry([['--orientation-horizontal', '--orientation']])
    );
    expect(used).toEqual(before);
  });

  test('shared-ancestor fan-in: each ancestor is added once and the walk terminates', () => {
    // Two used children share the same parent chain. The revisit guard must
    // stop the second child's climb as soon as it reaches an already-collected
    // ancestor, so the result is still correct and the walk terminates.
    const used = new Set(['--c-a-x', '--c-b-x']);
    rescueUsedAncestors(
      used,
      ancestry([
        ['--c-a', '--c'],
        ['--c-b', '--c'],
        ['--c-a-x', '--c-a'],
        ['--c-b-x', '--c-b'],
      ])
    );
    expect(used.has('--c')).toBe(true);
    expect(used.has('--c-a')).toBe(true);
    expect(used.has('--c-b')).toBe(true);
  });

  test('empty ancestry leaves the used set unchanged', () => {
    const used = new Set(['a', 'b']);
    rescueUsedAncestors(used, ancestry([]));
    expect(used).toEqual(new Set(['a', 'b']));
  });
});
