import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const run = (folder: string) =>
  runCheckUnusedCss(`src/__tests__/falsePositives/${folder}`);

// A reported finding renders as `  <file>:<line>:<col> - .<class>\n`. To assert
// a class is NOT reported we must anchor to the end of the token, otherwise
// ` - .--color` would also match the line for ` - .--color-primary-faded`.
const reportedLine = (cls: string): RegExp =>
  new RegExp(` - \\.${cls.replace(/[-]/g, '\\$&')}(?:\\n|$)`);

describe('false positives — ampersand-family parent rescue (Problem 1)', () => {
  describe('User Story 1 — a used child rescues its parent', () => {
    test('AmpParentDynamicChild: parent not unused (dynamic child), orphan reported', () => {
      const result = run('AmpParentDynamicChild');

      expect(result.exitCode).toBe(1);
      // genuine: `legacy` is unused
      expect(result.stdout).toMatch(
        /AmpParentDynamicChild\.module\.css:\d+:\d+ - \.legacy\b/
      );
      // rescued: parent `--orientation` must NOT be reported
      expect(result.stdout).not.toMatch(reportedLine('--orientation'));
      // children are covered dynamically, never reported
      expect(result.stdout).not.toMatch(
        reportedLine('--orientation-horizontal')
      );
      expect(result.stdout).not.toMatch(reportedLine('--orientation-vertical'));
    });

    test('AmpParentLiteralChild: parent rescued by a literal child; unused sibling reported', () => {
      const result = run('AmpParentLiteralChild');

      expect(result.exitCode).toBe(1);
      // rescued by the literal `--variant-faded`
      expect(result.stdout).not.toMatch(reportedLine('--variant'));
      expect(result.stdout).not.toMatch(reportedLine('--variant-faded'));
      // genuine: `--variant-outline` is unused
      expect(result.stdout).toMatch(
        /AmpParentLiteralChild\.module\.css:\d+:\d+ - \.--variant-outline\b/
      );
    });

    test('AmpParentCamel: camelCase parent rescued; unused camel sibling reported', () => {
      const result = run('AmpParentCamel');

      expect(result.exitCode).toBe(1);
      // rescued by `s.buttonBlack`
      expect(result.stdout).not.toMatch(reportedLine('button'));
      expect(result.stdout).not.toMatch(reportedLine('buttonBlack'));
      // genuine: `buttonWhite` is unused
      expect(result.stdout).toMatch(
        /AmpParentCamel\.module\.css:\d+:\d+ - \.buttonWhite\b/
      );
    });
  });

  describe('User Story 2 — multi-level families propagate "used" up the chain', () => {
    test('MultiLevelLeafUsed: deepest leaf rescues all ancestors', () => {
      const result = run('MultiLevelLeafUsed');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stdout).not.toMatch(reportedLine('--color'));
      expect(result.stdout).not.toMatch(reportedLine('--color-primary'));
    });

    test('MultiLevelMiddleUsed: ancestors rescued, deeper orphan still reported', () => {
      const result = run('MultiLevelMiddleUsed');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).not.toMatch(reportedLine('--color'));
      expect(result.stdout).not.toMatch(reportedLine('--color-primary'));
      // genuine: the unreferenced leaf
      expect(result.stdout).toMatch(
        /MultiLevelMiddleUsed\.module\.css:\d+:\d+ - \.--color-primary-faded\b/
      );
    });

    test('MixedDashCamelChain: mixed dash/camel ancestors all rescued', () => {
      const result = run('MixedDashCamelChain');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/No unused CSS classes found/);
      expect(result.stdout).not.toMatch(reportedLine('list'));
      expect(result.stdout).not.toMatch(reportedLine('listItem'));
    });
  });

  describe('User Story 6 — genuine findings preserved', () => {
    test('FamilyFullyUnused: an entirely-unused family still reports parent and children', () => {
      const result = run('FamilyFullyUnused');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /FamilyFullyUnused\.module\.css:\d+:\d+ - \.--size\b/
      );
      expect(result.stdout).toMatch(
        /FamilyFullyUnused\.module\.css:\d+:\d+ - \.--size-small\b/
      );
      expect(result.stdout).toMatch(
        /FamilyFullyUnused\.module\.css:\d+:\d+ - \.--size-large\b/
      );
    });

    test('StandaloneLegacy: a standalone unreferenced class is still unused', () => {
      const result = run('StandaloneLegacy');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(
        /StandaloneLegacy\.module\.css:\d+:\d+ - \.legacy\b/
      );
    });

    test('GenuineNonExistent: a missing class is still reported as non-existent', () => {
      const result = run('GenuineNonExistent');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(
        /Found .* classes used in source files but non-existent/
      );
      expect(result.stdout).toMatch(
        /GenuineNonExistent\.tsx:\d+:\d+ - \.toast\b/
      );
    });
  });

  describe('Comprehensive — both fixes together with genuine findings', () => {
    test('only genuine findings remain; exactly one ignore warning', () => {
      const result = run('Comprehensive');

      expect(result.exitCode).toBe(1);

      // Rescued: the `--variant` parent (a literal child is used) is not unused.
      expect(result.stdout).not.toMatch(reportedLine('--variant'));
      expect(result.stdout).not.toMatch(reportedLine('--variant-faded'));

      // Ignored module: none of `passed.module.css`'s classes are reported.
      expect(result.stdout).not.toMatch(reportedLine('--hidden'));
      expect(result.stdout).not.toMatch(reportedLine('root'));

      // Genuine unused: the unreferenced sibling and the dead standalone class.
      expect(result.stdout).toMatch(
        /widget\.module\.css:\d+:\d+ - \.--variant-outline\b/
      );
      expect(result.stdout).toMatch(
        /widget\.module\.css:\d+:\d+ - \.deadCode\b/
      );

      // Genuine non-existent: `ghost` is referenced but absent from the CSS.
      expect(result.stdout).toMatch(/Widget\.tsx:\d+:\d+ - \.ghost\b/);

      // Exactly one ignore warning, naming the ignored module.
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
      expect(result.stdout).toMatch(/module: .*passed\.module\.css/);
      const ignoreHeaderCount = (
        result.stderr.match(/CSS module\(s\) ignored/g) ?? []
      ).length;
      expect(ignoreHeaderCount).toBe(1);
    });
  });
});
