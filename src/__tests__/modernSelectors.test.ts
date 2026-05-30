import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from './runCheckUnusedCss.js';

/**
 * End-to-end guard for the CSS-extraction fixes (feature 005). The fixture uses
 * every modern selector style that previously produced false positives —
 * double-dash modifiers, nested `&.--x`, SCSS suffix concat under a compound
 * parent, and selector-bearing `@responsive` at-rules — all correctly defined
 * and referenced. None of those must be reported. At the same time the genuine
 * findings (a referenced-but-missing class, and a defined-but-unused class)
 * MUST still be reported, proving the fixes do not over-correct.
 */
describe('Modern CSS-Modules selectors (feature 005)', () => {
  const result = runCheckUnusedCss('src/__tests__/withError/ModernSelectors');

  test('reports the genuinely non-existent classes (true positives)', () => {
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(
      /Found .* classes used in source files but non-existent in CSS/
    );
    expect(result.stdout).toMatch(/ModernSelectors\.tsx:\d+:\d+ - \.missing/);
    expect(result.stdout).toMatch(
      /ModernSelectors\.tsx:\d+:\d+ - \.alsoMissing/
    );
  });

  test('reports the genuinely unused class (true positive)', () => {
    expect(result.stdout).toMatch(
      /ModernSelectors\.module\.css:\d+:\d+ - \.actuallyUnused/
    );
  });

  test('does NOT report any defined modern-selector class as a false positive', () => {
    const falsePositiveClasses = [
      // nested `&.--modifier`
      '--reversed',
      '--error',
      // SCSS suffix concat under a compound parent
      '--variant',
      '--variant-faded',
      '--variant-outline',
      // selector-bearing @responsive at-rules
      'item',
      '--hidden',
      '--visibility',
      // the wrong name the old code would have derived for Badge-style concat
      'root-faded',
    ];

    for (const className of falsePositiveClasses) {
      // Reported lines look like `... - .<className>`; assert none appears.
      const reported = new RegExp(
        `- \\.${className.replace(/[-]/g, '\\-')}(\\s|$)`,
        'm'
      );
      expect(result.stdout).not.toMatch(reported);
    }
  });
});
