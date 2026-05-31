import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from './runCheckUnusedCss.js';

/**
 * End-to-end guard against SCSS directives leaking their params as class names.
 * `@include fonts.body-accent`, `@use "…/_fonts.scss"`, `@mixin name()` and
 * `@each $x in a.b` all carry a dot that the extractor once misread as a class,
 * producing a flood of phantom "unused" findings (regression after #79).
 *
 * Two fixtures:
 *  - noError/ScssDirectives — every real class is used; nothing must be
 *    reported, and no mixin/module name may surface.
 *  - withError/ScssDirectivesUnused — one genuinely unused class (`.orphan`)
 *    must still be reported, while directive names must not.
 */

/** Match a reported finding line `… - .<className>` (end-anchored). */
const reportedLine = (className: string): RegExp =>
  new RegExp(`- \\.${className.replace(/[-]/g, '\\-')}(?:\\s|$)`, 'm');

describe('SCSS directives are not class definitions (no false positives)', () => {
  const result = runCheckUnusedCss('src/__tests__/noError/ScssDirectives');

  test('exits cleanly with no findings', () => {
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });

  test('does not report any mixin name, module path or @each item as unused', () => {
    const phantoms = [
      // namespaced @include params
      'body-accent',
      'title3',
      'visually-hidden',
      // local @mixin name
      'card-typography',
      // @use / @forward module path fragments
      'fonts',
      '_fonts',
      'a11y',
      '_a11y',
      'tokens',
      // @each dotted list items
      'dark',
      'light',
      'primary',
      'secondary',
    ];

    for (const phantom of phantoms) {
      expect(result.stdout).not.toMatch(reportedLine(phantom));
    }
  });

  test('recognizes a class promoted by @at-root (real class in at-rule params)', () => {
    // `.promoted` is defined via `@at-root .promoted { … }` and is used in the
    // component. If the extractor failed to see it as defined, a "used but
    // non-existent" finding would appear; if it failed to see it as used, an
    // "unused" finding would appear. Neither must happen.
    expect(result.stdout).not.toMatch(reportedLine('promoted'));
    expect(result.exitCode).toBe(0);
  });
});

describe('SCSS directives do not suppress genuine unused classes', () => {
  const result = runCheckUnusedCss(
    'src/__tests__/withError/ScssDirectivesUnused'
  );

  test('reports the genuinely unused class', () => {
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(
      /Found .* classes defined in CSS but unused in source files/
    );
    expect(result.stdout).toMatch(
      /ScssDirectivesUnused\.module\.scss:\d+:\d+ - \.orphan/
    );
  });

  test('does not report mixin/directive names alongside the real finding', () => {
    const phantoms = ['body-accent-xs', 'title4', 'button-typography', 'fonts'];
    for (const phantom of phantoms) {
      expect(result.stdout).not.toMatch(reportedLine(phantom));
    }
  });

  test('does not report the used classes', () => {
    expect(result.stdout).not.toMatch(reportedLine('button'));
    expect(result.stdout).not.toMatch(reportedLine('label'));
  });
});
