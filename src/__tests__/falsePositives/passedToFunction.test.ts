import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const run = (folder: string) =>
  runCheckUnusedCss(`src/__tests__/falsePositives/${folder}`);

const reportedLine = (cls: string): RegExp =>
  new RegExp(` - \\.${cls.replace(/[-]/g, '\\$&')}(?:\\n|$)`);

describe('false positives — whole CSS module passed to a function (Problem 2)', () => {
  describe('User Story 3 — whole module passed to a function is ignored, with a warning', () => {
    test('PassedToFunctionUnused: no unused reported; ignore warning printed', () => {
      const result = run('PassedToFunctionUnused');

      // No unused finding for the ignored module.
      expect(result.stdout).not.toMatch(reportedLine('--nowrap'));
      expect(result.stdout).not.toMatch(reportedLine('root'));
      // A distinct warning (header on stderr) names the reason; the per-module
      // detail line (source file + module) is printed to stdout.
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.stdout).toMatch(/PassedToFunctionUnused\.tsx/);
      expect(result.stdout).toMatch(
        /module: .*PassedToFunctionUnused\.module\.css/
      );
      // The warning alone does not flip the exit code.
      expect(result.exitCode).toBe(0);
    });

    test('PassedToFunctionNonExistent: missing class suppressed for the ignored module', () => {
      const result = run('PassedToFunctionNonExistent');

      expect(result.stdout).not.toMatch(reportedLine('doesNotExist'));
      expect(result.stderr).not.toMatch(
        /Found .* classes used in source files but non-existent/
      );
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.exitCode).toBe(0);
    });

    test('DirectReadOnly: direct-only reads are analyzed normally (orphan reported, no warning)', () => {
      const result = run('DirectReadOnly');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /DirectReadOnly\.module\.css:\d+:\d+ - \.orphan\b/
      );
      expect(result.stderr).not.toMatch(/passed to a function/i);
    });

    test('ComposedHandoff: classNames(..., responsiveClassNames(s, ...)) ignores the module', () => {
      const result = run('ComposedHandoff');

      // The whole `s` reaches the inner call, so the module is ignored and
      // `.--full-width` is not a false unused (the real reshaped Button shape).
      expect(result.stdout).not.toMatch(reportedLine('--full-width'));
      expect(result.stdout).not.toMatch(reportedLine('root'));
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.stdout).toMatch(/ComposedHandoff\.tsx/);
      expect(result.exitCode).toBe(0);
    });

    test('PropertyToFunction: passing s.root (a property) does not ignore the module', () => {
      const result = run('PropertyToFunction');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /PropertyToFunction\.module\.css:\d+:\d+ - \.orphan\b/
      );
      expect(result.stderr).not.toMatch(/passed to a function/i);
    });
  });

  describe('User Story 4 — mixed access in one file still ignores the module', () => {
    test('MixedPassAndDirect: hand-off dominates direct reads; module ignored + warned', () => {
      const result = run('MixedPassAndDirect');

      expect(result.stdout).not.toMatch(reportedLine('wouldBeUnused'));
      expect(result.stdout).not.toMatch(reportedLine('--x'));
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.stdout).toMatch(/MixedPassAndDirect\.tsx/);
    });
  });

  describe('User Story 5 — only the module passed whole is ignored', () => {
    test('TwoModulesOneIgnored: s ignored+warned; t analyzed with genuine findings', () => {
      const result = run('TwoModulesOneIgnored');

      // s's module is ignored: its classes never appear.
      expect(result.stdout).not.toMatch(reportedLine('--passed'));
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.stdout).toMatch(/module: .*ignored\.module\.css/);

      // t's module is analyzed normally: genuine unused AND non-existent.
      expect(result.stdout).toMatch(
        /analyzed\.module\.css:\d+:\d+ - \.tOrphan\b/
      );
      expect(result.stdout).toMatch(
        /TwoModulesOneIgnored\.tsx:\d+:\d+ - \.missing\b/
      );
      expect(result.exitCode).toBe(1);
    });
  });
});
