import { describe, expect, test } from 'bun:test';
import { applyCoverage } from './applyCoverage.js';
import type { AccessClassification, ClassAccess } from './types.js';

const at = (classification: AccessClassification): ClassAccess => ({
  classification,
  display: 'styles[expr]',
  file: 'test.tsx',
  line: 1,
  column: 1,
});

const literals = (...classNames: string[]): ClassAccess =>
  at({ kind: 'literals', classNames });

const pattern = (source: string): ClassAccess =>
  at({ kind: 'pattern', regex: new RegExp(source), source, segments: [] });

const coversAll = (): ClassAccess => at({ kind: 'coversAll' });

describe('applyCoverage', () => {
  test('literals cover only the named classes', () => {
    const out = applyCoverage(['a', 'b', 'c'], [literals('a')]);
    expect([...out.coveredClasses]).toEqual(['a']);
    expect(out.coversAll).toBe(false);
  });

  test('pattern covers the matching subset', () => {
    const out = applyCoverage(
      ['btn-a', 'btn-b', 'card'],
      [pattern('^btn-.*$')]
    );
    expect([...out.coveredClasses].sort()).toEqual(['btn-a', 'btn-b']);
    expect(out.coveredClasses.has('card')).toBe(false);
  });

  test('literals + pattern union', () => {
    const out = applyCoverage(
      ['btn-a', 'card', 'x'],
      [pattern('^btn-.*$'), literals('card')]
    );
    expect([...out.coveredClasses].sort()).toEqual(['btn-a', 'card']);
    expect(out.coveredClasses.has('x')).toBe(false);
  });

  test('a single coversAll forces the flag (absorbing)', () => {
    const out = applyCoverage(['a', 'b'], [pattern('^btn-.*$'), coversAll()]);
    expect(out.coversAll).toBe(true);
  });

  test('coversAll precedence is independent of order across files', () => {
    const out = applyCoverage(['a', 'b'], [coversAll(), pattern('^btn-.*$')]);
    expect(out.coversAll).toBe(true);
  });

  test('pattern matching nothing leaves classes uncovered', () => {
    const out = applyCoverage(['card', 'icon'], [pattern('^btn-.*$')]);
    expect(out.coveredClasses.size).toBe(0);
    expect(out.coversAll).toBe(false);
  });

  test('module-additive: covered if covered in any file', () => {
    const out = applyCoverage(['a', 'b'], [literals('a'), literals('b')]);
    expect([...out.coveredClasses].sort()).toEqual(['a', 'b']);
  });

  test('empty accesses cover nothing and are not coversAll', () => {
    const out = applyCoverage(['a'], []);
    expect(out.coveredClasses.size).toBe(0);
    expect(out.coversAll).toBe(false);
  });

  test('coversAll accesses are retained for reporting', () => {
    const access = coversAll();
    const out = applyCoverage(['a'], [access]);
    expect(out.coversAllAccesses).toHaveLength(1);
    expect(out.coversAllAccesses[0]?.display).toBe('styles[expr]');
  });

  test('a class covered by both a literal and a pattern is not double-counted', () => {
    // `btn-lg` is reached as a literal AND matched by `^btn-.*$`; the Set must
    // contain it exactly once.
    const out = applyCoverage(
      ['btn-lg', 'btn-sm', 'other'],
      [literals('btn-lg'), pattern('^btn-.*$')]
    );
    expect([...out.coveredClasses].sort()).toEqual(['btn-lg', 'btn-sm']);
    expect(out.coveredClasses.size).toBe(2);
    expect(out.coveredClasses.has('other')).toBe(false);
  });

  test('two patterns with overlapping regex spaces cover the union, each class once', () => {
    // `^btn-.*$` and `^btn-.*-.*$` both match `btn-x-y`; it stays counted once.
    const out = applyCoverage(
      ['btn-x', 'btn-x-y', 'nav-z'],
      [pattern('^btn-.*$'), pattern('^btn-.*-.*$')]
    );
    expect([...out.coveredClasses].sort()).toEqual(['btn-x', 'btn-x-y']);
    expect(out.coveredClasses.has('nav-z')).toBe(false);
  });
});
