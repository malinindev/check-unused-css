import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const run = (folder: string, noDynamic?: boolean) =>
  runCheckUnusedCss(
    `src/__tests__/dynamicCoverage/${folder}`,
    undefined,
    noDynamic
  );

/**
 * Two large end-to-end scenarios, each exercising many dynamic-access shapes at
 * once across multiple files importing a single CSS module:
 *  - ComprehensiveNoError: every class is covered (static, ternary literals,
 *    several distinct template patterns, cross-file additivity, literal/pattern
 *    overlap, empty-wildcard prefix) -> a clean run.
 *  - ComprehensiveWithErrors: covered classes coexist with genuinely-unused
 *    ones -> the unused are reported precisely, never hidden by the surrounding
 *    dynamic access.
 */
describe('dynamic coverage — comprehensive scenarios', () => {
  describe('ComprehensiveNoError: many dynamic shapes, everything covered', () => {
    test('report mode: clean run, no unused, no dynamic warning', () => {
      const result = run('ComprehensiveNoError');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
      expect(result.stderr).not.toMatch(/unused in source files/);
    });

    test('--no-dynamic: still clean (no covers-all access anywhere)', () => {
      const result = run('ComprehensiveNoError', true);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toMatch(/Error: Dynamic class usage detected/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
    });

    test('no individual covered class leaks into a report', () => {
      const result = run('ComprehensiveNoError');

      for (const covered of [
        'root',
        'header',
        'active',
        'inactive',
        'small',
        'medium',
        'large',
        'icon',
        'iconHome',
        'iconUser',
        'buttonPrimary',
        'buttonSecondary',
        'col3Span',
        'col12Span',
        'grid2x4',
        'tabActive',
        'sizeLarge',
      ]) {
        expect(result.stdout).not.toMatch(new RegExp(` - \\.${covered}\\b`));
      }
    });
  });

  describe('ComprehensiveWithErrors: covered + genuinely-unused coexist', () => {
    test('reports exactly the four uncovered classes', () => {
      const result = run('ComprehensiveWithErrors');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(
        /Found 4 classes defined in CSS but unused/
      );
      expect(result.stdout).toMatch(/ - \.orphan\b/);
      expect(result.stdout).toMatch(/ - \.imageThumbnail\b/);
      expect(result.stdout).toMatch(/ - \.deprecatedBanner\b/);
      expect(result.stdout).toMatch(/ - \.legacyTooltip\b/);
    });

    test('does not report any class covered statically, by ternary, or by a pattern', () => {
      const result = run('ComprehensiveWithErrors');

      for (const covered of [
        'root',
        'active',
        'inactive',
        'buttonPrimary',
        'buttonSecondary',
        'iconHome',
        'iconUser',
      ]) {
        expect(result.stdout).not.toMatch(new RegExp(` - \\.${covered}\\b`));
      }
    });

    test('no module-level suppression: dynamic access does not hide the unused', () => {
      const result = run('ComprehensiveWithErrors');

      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });

    test('--no-dynamic: exits 1 on the unused classes, not on a dynamic error', () => {
      const result = run('ComprehensiveWithErrors', true);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).not.toMatch(/Error: Dynamic class usage detected/);
      expect(result.stdout).toMatch(/ - \.orphan\b/);
    });
  });
});
