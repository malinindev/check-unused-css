import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from './runCheckUnusedCss.js';

/**
 * Guard for issue #90: classes pulled into a CSS module via `@use`, `@forward`
 * or the legacy `@import` are emitted into the module's compiled CSS, so they
 * are real, usable classes. They must NOT be reported as "used but
 * non-existent", and they must NOT be reported as unused for the importing
 * module (a shared partial is not owned by the module that imports it).
 *
 * The fix must stay precise on both sides:
 *  - it must still flag a class that exists nowhere (`.ghost`);
 *  - it must still flag a genuinely unused LOCAL class even when the module
 *    imports a partial.
 */

/** Match a reported finding line `… - .<className>` (end-anchored). */
const reportedLine = (className: string): RegExp =>
  new RegExp(`- \\.${className.replace(/[-]/g, '\\-')}(?:\\s|$)`, 'm');

describe('SCSS @use/@forward/@import pull partial classes into the module', () => {
  test('@use: classes from the used partial are not reported as non-existent', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssUse');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
    expect(result.stdout).not.toMatch(/non-existent/i);
  });

  test('@use with a namespace still surfaces the partial classes', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssUseNamespaced');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('highlight'));
  });

  test('@forward chained through _index.scss reaches the leaf partial', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssForward');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('button'));
    expect(result.stdout).not.toMatch(reportedLine('button-primary'));
  });

  test('legacy @import inlines the partial classes', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssImport');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('legacy-box'));
  });

  test('a class imported via @use but never referenced is not reported as unused', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noError/ScssUseUnusedPartial'
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('unused-in-partial'));
  });

  test('@use resolves a partial in a subdirectory', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssUseSubdir');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('heading'));
  });

  test('a partial reachable through two @forward paths is resolved once', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssUseDiamond');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('base-class'));
  });

  test('a cycle of @import partials terminates and still collects classes', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/ScssImportCycle');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(reportedLine('ping'));
    expect(result.stdout).not.toMatch(reportedLine('pong'));
  });

  test('a missing partial does not crash the run', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noError/ScssUseMissingPartial'
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });
});

describe('SCSS @use does not mask genuine findings', () => {
  test('a class that exists nowhere is still reported as non-existent', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/ScssUseNonExistent'
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/ScssUseNonExistent\.tsx:\d+:\d+ - \.ghost/);
    // The classes that DO exist (module-local + partial) must not be flagged.
    expect(result.stdout).not.toMatch(reportedLine('shared'));
    expect(result.stdout).not.toMatch(reportedLine('local'));
  });

  test('a genuinely unused LOCAL class is still reported despite the @use import', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/ScssUseLocalUnused'
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(
      /Found .* classes defined in CSS but unused in source files/
    );
    expect(result.stdout).toMatch(
      /ScssUseLocalUnused\.module\.scss:\d+:\d+ - \.localUnused/
    );
    // The used classes (local + partial) must not be flagged.
    expect(result.stdout).not.toMatch(reportedLine('used'));
    expect(result.stdout).not.toMatch(reportedLine('shared'));
  });
});
