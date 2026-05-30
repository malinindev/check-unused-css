import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const run = (folder: string) =>
  runCheckUnusedCss(`src/__tests__/dynamicCoverage/${folder}`);

describe('dynamic coverage — pointwise exclusion of CSS classes', () => {
  describe('User Story 1 — template with a constant part', () => {
    test('TemplatePattern: reports only the unrelated class', () => {
      const result = run('TemplatePattern');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(
        /Found .* classes defined in CSS but unused/
      );
      expect(result.stdout).toMatch(
        /TemplatePattern\.module\.css:\d+:\d+ - \.unrelated\b/
      );
    });

    test('TemplatePattern: covered classes are not reported, no dynamic warning', () => {
      const result = run('TemplatePattern');

      expect(result.stdout).not.toMatch(/ - \.btn-a\b/);
      expect(result.stdout).not.toMatch(/ - \.btn-b\b/);
      expect(result.stdout).not.toMatch(/ - \.card\b/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });

    test('TemplateMiddleConst: a-foo and x-b reported, a-foo-b covered (US1.3)', () => {
      const result = run('TemplateMiddleConst');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /TemplateMiddleConst\.module\.css:\d+:\d+ - \.a-foo\b/
      );
      expect(result.stdout).toMatch(
        /TemplateMiddleConst\.module\.css:\d+:\d+ - \.x-b\b/
      );
      expect(result.stdout).not.toMatch(/ - \.a-foo-b\b/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });

    test('AllCovered: pattern + literal cover everything, clean run', () => {
      const result = run('AllCovered');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });
  });

  describe('User Story 2 — ternary of string literals', () => {
    test('TernaryLiterals: leftover c reported, a/b used, no dynamic warning', () => {
      const result = run('TernaryLiterals');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /TernaryLiterals\.module\.css:\d+:\d+ - \.c\b/
      );
      expect(result.stdout).not.toMatch(/ - \.a\b/);
      expect(result.stdout).not.toMatch(/ - \.b\b/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });

    test('NestedTernaryLiterals: only orphan reported, all leaves used', () => {
      const result = run('NestedTernaryLiterals');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /NestedTernaryLiterals\.module\.css:\d+:\d+ - \.orphan\b/
      );
      expect(result.stdout).not.toMatch(/ - \.a\b/);
      expect(result.stdout).not.toMatch(/ - \.b\b/);
      expect(result.stdout).not.toMatch(/ - \.c\b/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });
  });

  describe('User Story 3 — bare variable still covers all (regression guard)', () => {
    test('BareVariable: covers all, nothing reported unused', () => {
      const result = run('BareVariable');

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stdout).toMatch(
        /BareVariable\.tsx:\d+:\d+ - \.styles\[variant\]/
      );
    });

    test('NoConstTemplate: template without a constant part covers all', () => {
      const result = run('NoConstTemplate');

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
    });

    test('Concat: string concatenation covers all (out of scope)', () => {
      const result = run('Concat');

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stdout).not.toMatch(/ - \.other\b/);
    });

    test('IgnoredCoversAll: a disable-next-line on a dynamic line must not surface false unused', () => {
      const result = run('IgnoredCoversAll');

      // `onlyViaDynamic` is reachable only through the (ignored) dynamic access;
      // it must NOT be reported as unused.
      expect(result.stdout).not.toMatch(/ - \.onlyViaDynamic\b/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('User Story 4 — mixed access and cross-file precedence', () => {
    test('MixedUserStory4: only orphan reported, nothing else, no warning', () => {
      const result = run('MixedUserStory4');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /MixedUserStory4\.module\.css:\d+:\d+ - \.orphan\b/
      );
      expect(result.stdout).not.toMatch(/ - \.header\b/);
      expect(result.stdout).not.toMatch(/ - \.active\b/);
      expect(result.stdout).not.toMatch(/ - \.inactive\b/);
      expect(result.stdout).not.toMatch(/ - \.icon-home\b/);
      expect(result.stdout).not.toMatch(/ - \.icon-user\b/);
      expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    });

    test('MultiFileCoversAllWins: coversAll in one file suppresses the whole module', () => {
      const result = run('MultiFileCoversAllWins');

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
      expect(result.stdout).not.toMatch(/ - \.loner\b/);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
    });
  });
});
