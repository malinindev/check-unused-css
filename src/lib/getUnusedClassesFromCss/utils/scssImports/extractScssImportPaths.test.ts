import { describe, expect, test } from 'bun:test';
import { extractScssImportPaths } from './extractScssImportPaths.js';

describe('extractScssImportPaths', () => {
  test('extracts a basic @use', () => {
    expect(extractScssImportPaths(`@use 'shared';`)).toEqual(['shared']);
  });

  test('extracts @use with double quotes', () => {
    expect(extractScssImportPaths(`@use "shared";`)).toEqual(['shared']);
  });

  test('ignores the namespace, config and member filters', () => {
    const content = `
      @use 'a' as ns;
      @use 'b' with ($x: 1, $y: 2);
      @forward 'c' show mixin-a, $var-b;
      @forward 'd' hide thing;
      @forward 'e' as prefix-*;
    `;
    expect(extractScssImportPaths(content)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('extracts @forward', () => {
    expect(extractScssImportPaths(`@forward 'buttons';`)).toEqual(['buttons']);
  });

  test('extracts a legacy @import', () => {
    expect(extractScssImportPaths(`@import 'legacy';`)).toEqual(['legacy']);
  });

  test('extracts each spec from a comma-separated @import list', () => {
    expect(extractScssImportPaths(`@import 'a', 'b', 'c';`)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('keeps subdirectory specs intact', () => {
    expect(extractScssImportPaths(`@use 'partials/typography';`)).toEqual([
      'partials/typography',
    ]);
  });

  test('ignores plain CSS @import: url(...)', () => {
    expect(
      extractScssImportPaths(`@import url("https://fonts.example/x.css");`)
    ).toEqual([]);
  });

  test('ignores plain CSS @import: .css extension', () => {
    expect(extractScssImportPaths(`@import 'reset.css';`)).toEqual([]);
  });

  test('ignores plain CSS @import: remote URL', () => {
    expect(
      extractScssImportPaths(`@import 'https://x.example/a.scss';`)
    ).toEqual([]);
  });

  test('ignores plain CSS @import: trailing media query', () => {
    expect(
      extractScssImportPaths(
        `@import "screen.css" screen and (min-width: 400px);`
      )
    ).toEqual([]);
  });

  test('ignores @import with a media query even without .css', () => {
    expect(
      extractScssImportPaths(`@import 'tablet' (min-width: 768px);`)
    ).toEqual([]);
  });

  test('returns nothing for a file with no import directives', () => {
    expect(extractScssImportPaths(`.box { color: red; }`)).toEqual([]);
  });

  test('does not treat other at-rules as imports', () => {
    const content = `
      @media (min-width: 1px) { .a { color: red; } }
      @include fonts.body;
      @mixin thing() { color: blue; }
    `;
    expect(extractScssImportPaths(content)).toEqual([]);
  });

  test('handles a multi-line @use ... with (...) block', () => {
    const content = `@use 'shared' with (\n  $primary: blue,\n  $secondary: red\n);`;
    expect(extractScssImportPaths(content)).toEqual(['shared']);
  });

  test('keeps the path for @forward with an `as prefix-*`', () => {
    expect(extractScssImportPaths(`@forward 'src/list' as list-*;`)).toEqual([
      'src/list',
    ]);
  });

  test('parses an @import list with irregular spacing and mixed quotes', () => {
    expect(extractScssImportPaths(`@import "a","b" ,  'c';`)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('ignores a commented-out directive (line comment)', () => {
    expect(extractScssImportPaths(`// @use 'commented';\n.box {}`)).toEqual([]);
  });

  test('ignores a commented-out directive (block comment)', () => {
    expect(
      extractScssImportPaths(`/* @use 'blockcommented'; */\n.box {}`)
    ).toEqual([]);
  });
});
