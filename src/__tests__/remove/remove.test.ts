import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));

type FixtureHandle = {
  tmp: string;
  css: string;
};

const copyFixture = (name: string): FixtureHandle => {
  const src = path.join(FIXTURES_DIR, name);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `scuc-remove-${name}-`));
  fs.cpSync(src, tmp, { recursive: true });
  return { tmp, css: path.join(tmp, 'Card.module.scss') };
};

const cleanup = (handle: FixtureHandle): void => {
  fs.rmSync(handle.tmp, { recursive: true, force: true });
};

const readCss = (handle: FixtureHandle): string =>
  fs.readFileSync(handle.css, 'utf-8');

const handles: FixtureHandle[] = [];

const fixture = (name: string): FixtureHandle => {
  const h = copyFixture(name);
  handles.push(h);
  return h;
};

// Each fixture is copied to a temp dir and the CLI runs there so no fixture
// is ever mutated on disk. The helper handles stdin and extraArgs so we can
// exercise TTY / non-TTY paths end-to-end.
//
// NOTE: an "interactive decline" integration test would require a real PTY
// (process.stdin.isTTY must be true for the CLI to even reach confirmPrompt).
// The decline path is covered instead by confirmPrompt.test.ts (every
// yes/no/EOF branch on a fake stream) + printRunSummary.test.ts
// (declinedByUser output).

describe('--remove', () => {
  afterEach(() => {
    while (handles.length > 0) {
      const h = handles.pop();
      if (h) cleanup(h);
    }
  });

  test('Simple: removes a plain .unusedCard { } and keeps the used rule intact', () => {
    const h = fixture('Simple');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);
    const after = readCss(h);
    expect(after).toContain('.used {');
    expect(after).toContain('color: blue;');
    expect(after).not.toContain('.unusedCard');
    // Rule-body preservation is an architectural guarantee (postcss raws) —
    // the .used rule's declaration stays byte-identical. Whitespace that
    // belonged to `.unusedCard`'s `raws.before` (the blank line between
    // rules) is consumed together with the removed rule, which is the
    // desired tidy behavior.
    expect(after).toMatch(/\.used\s*\{\s*color:\s*blue;\s*\}/);
  });

  test('LeadingCompound: removes every rule whose leading compound contains the unused class', () => {
    const h = fixture('LeadingCompound');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toContain('.used {');
    expect(after).not.toContain('.unusedCard');
    // Summary reports 9 rule removals (every variant + plain .unusedCard)
    expect(result.stdout).toMatch(/removed 9 rule\(s\)/);
  });

  test('SharedList: strips .unusedCard from `.used, .unusedCard, .other` while keeping rule', () => {
    const h = fixture('SharedList');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toContain('.used');
    expect(after).toContain('.other');
    expect(after).not.toMatch(/\.unusedCard/);
    expect(after).toContain('color: red');
    expect(result.stdout).toMatch(/stripped 1 selector\(s\)/);
    expect(result.stdout).toMatch(/removed 0 rule\(s\)/);
  });

  test('SharedListEmptied: empty shared list after strip degrades to rule removal', () => {
    const h = fixture('SharedListEmptied');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toContain('.kept {');
    expect(after).not.toMatch(/\.unusedCard/);
  });

  test('NestedAmpersand: removes only the nested &.unusedCard rule, keeps parent untouched', () => {
    const h = fixture('NestedAmpersand');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toMatch(/\.parent\s*\{/);
    expect(after).toContain('color: blue');
    expect(after).not.toMatch(/&\.unusedCard/);
  });

  test('Warn: non-leading uses trigger warnings, no writes', () => {
    const h = fixture('Warn');
    const before = readCss(h);
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toBe(before);
    expect(result.stdout).toMatch(/Manual review/);
    expect(result.stdout).toContain('.wrapper .unusedCard');
    expect(result.stdout).toContain('.unusedCard');
  });

  test('NonTty: non-TTY without --yes aborts with exit 2 and no file writes', () => {
    const h = fixture('NonTty');
    const before = readCss(h);
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove'],
      stdin: 'closed',
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Refusing to run without a TTY/);
    expect(readCss(h)).toBe(before);
  });

  test('Yes: --yes skips prompt entirely and writes the file', () => {
    const h = fixture('Yes');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Plan:/);
    expect(result.stdout).not.toMatch(/Apply these changes\?/);
  });

  test('Empty: file becomes empty when every rule is removed', () => {
    const h = fixture('Empty');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    expect(fs.existsSync(h.css)).toBe(true);
    const after = readCss(h);
    expect(after.trim()).toBe('');
    expect(result.stdout).toMatch(/1 file\(s\) now empty/);
  });

  test('NothingToDo: no unused classes → graceful exit 0 with no prompt', () => {
    const h = fixture('NothingToDo');
    const before = readCss(h);
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Nothing to remove\./);
    expect(result.stdout).not.toMatch(/Apply these changes\?/);
    expect(readCss(h)).toBe(before);
  });

  test('RuleWithNestedBody: removes the whole simple top-level rule including its nested body', () => {
    const h = fixture('RuleWithNestedBody');
    const result = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(result.exitCode).toBe(0);

    const after = readCss(h);
    expect(after).toContain('.used {');
    expect(after).not.toMatch(/\.unusedCard/);
    const openBraces = (after.match(/\{/g) ?? []).length;
    const closeBraces = (after.match(/\}/g) ?? []).length;
    expect(openBraces).toBe(closeBraces);
  });

  test('post-run report is clean: re-running without flags reports no unused (SC-004)', () => {
    const h = fixture('Simple');
    const first = runCheckUnusedCss({
      targetPath: '.',
      extraArgs: ['--remove', '--yes'],
      cwd: h.tmp,
    });
    expect(first.exitCode).toBe(0);

    const second = runCheckUnusedCss({
      targetPath: '.',
      cwd: h.tmp,
    });
    expect(second.exitCode).toBe(0);
  });
});
