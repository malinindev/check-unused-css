import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const run = (folder: string) =>
  runCheckUnusedCss(`src/__tests__/falsePositives/${folder}`);

// A reported finding renders as `  <file>:<line>:<col> - .<class>\n`. To assert
// a class is NOT reported we must anchor to the end of the token, otherwise
// ` - .base` would also match a longer ` - .baseButton` line.
const reportedLine = (cls: string): RegExp =>
  new RegExp(` - \\.${cls.replace(/[-]/g, '\\$&')}(?:\\n|$)`);

describe('false positives — CSS Modules composes (issue #83)', () => {
  test('ComposesLocalDirectUse: a directly-used composed target is not non-existent', () => {
    const result = run('ComposesLocalDirectUse');

    expect(result.exitCode).toBe(1);

    // `.definedClass` is a real local class also referenced by `composes`. A
    // direct `styles.definedClass` read must resolve — never "non-existent".
    expect(result.stderr).not.toMatch(/non-existent/);
    expect(result.stdout).not.toMatch(
      /ComposesLocalDirectUse\.tsx:\d+:\d+ - \.definedClass\b/
    );

    // `.composingClass` is never used in code → the only genuine unused class.
    expect(result.stdout).toMatch(
      /ComposesLocalDirectUse\.module\.css:\d+:\d+ - \.composingClass\b/
    );
  });

  test('ComposesLocalIndirectUse: a composed-only target is used, orphan still reported', () => {
    const result = run('ComposesLocalIndirectUse');

    expect(result.exitCode).toBe(1);

    // `.base` is referenced only via `composes` from the used `.button`. It must
    // count as used (not unused) and must exist (not non-existent).
    expect(result.stderr).not.toMatch(/non-existent/);
    expect(result.stdout).not.toMatch(reportedLine('base'));
    expect(result.stdout).not.toMatch(reportedLine('button'));

    // `.orphan` is genuinely unused.
    expect(result.stdout).toMatch(
      /ComposesLocalIndirectUse\.module\.css:\d+:\d+ - \.orphan\b/
    );
  });

  test('ComposesFromExternal: external/global composes targets do not leak', () => {
    const result = run('ComposesFromExternal');

    // `.card` is used directly; `base`/`highlight` are external and must not be
    // extracted as defined classes, so the run is clean.
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
    expect(result.stderr).not.toMatch(/non-existent/);
  });
});
