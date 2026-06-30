import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { collectPartialClasses } from './collectPartialClasses.js';

let root: string;

const write = (relPath: string, content: string): string => {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-partials-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('collectPartialClasses', () => {
  test('collects classes from a @use partial', () => {
    write('_shared.scss', '.box { color: red; } .panel {}');
    const module = write('M.module.scss', `@use 'shared';\n.local {}`);

    const classes = collectPartialClasses(module);
    expect([...classes].sort()).toEqual(['box', 'panel']);
  });

  test("does not include the module's own classes", () => {
    write('_shared.scss', '.box {}');
    const module = write('M.module.scss', `@use 'shared';\n.local {}`);

    expect(collectPartialClasses(module).has('local')).toBe(false);
  });

  test('follows @forward transitively', () => {
    write('_leaf.scss', '.leaf {}');
    write('_mid.scss', `@forward 'leaf';`);
    const module = write('M.module.scss', `@use 'mid';`);

    expect([...collectPartialClasses(module)]).toEqual(['leaf']);
  });

  test('terminates on an @import cycle and still collects all classes', () => {
    write('_ping.scss', `@import 'pong';\n.ping {}`);
    write('_pong.scss', `@import 'ping';\n.pong {}`);
    const module = write('M.module.scss', `@import 'ping';`);

    expect([...collectPartialClasses(module)].sort()).toEqual(['ping', 'pong']);
  });

  test('collects classes from a .css partial loaded by a bare @use spec', () => {
    // Sass loads `code.css` for a bare `@use 'code'` and inlines its rules, so
    // the class is real. (A `.css` spec WITH the extension is a plain CSS
    // import and is filtered out before reaching here.)
    write('code.css', '.code {}');
    const module = write('M.module.scss', `@use 'code';`);

    expect([...collectPartialClasses(module)]).toEqual(['code']);
  });

  test('visits a diamond leaf exactly once', () => {
    write('_base.scss', '.base {}');
    write('_left.scss', `@forward 'base';`);
    write('_right.scss', `@forward 'base';`);
    const module = write('M.module.scss', `@use 'left';\n@use 'right';`);

    // A Set dedupes by name anyway; this asserts the traversal terminates and
    // yields the single shared class.
    expect([...collectPartialClasses(module)]).toEqual(['base']);
  });

  test('returns an empty set for a missing partial', () => {
    const module = write('M.module.scss', `@use 'nope';\n.local {}`);
    expect(collectPartialClasses(module).size).toBe(0);
  });

  test('returns an empty set when the module file is unreadable', () => {
    expect(
      collectPartialClasses(path.join(root, 'ghost.module.scss')).size
    ).toBe(0);
  });

  test('resolves partials relative to the importing partial, not the module', () => {
    // `_mid.scss` lives in `sub/`; its `@use 'leaf'` must resolve to
    // `sub/_leaf.scss`, not `_leaf.scss` next to the module.
    write('sub/_leaf.scss', '.deep {}');
    write('sub/_mid.scss', `@use 'leaf';`);
    const module = write('M.module.scss', `@use 'sub/mid';`);

    expect([...collectPartialClasses(module)]).toEqual(['deep']);
  });

  test('a malformed partial does not throw and still collects valid ones', () => {
    // `_broken.scss` has an unclosed block, which makes postcss-scss throw.
    // The walk must swallow that and still return `.ok` from the valid partial.
    write('_broken.scss', '.bad { color: red;');
    write('_good.scss', '.ok {}');
    const module = write('M.module.scss', `@use 'broken';\n@use 'good';`);

    expect([...collectPartialClasses(module)]).toEqual(['ok']);
  });

  test('a class that exists only in a malformed partial is NOT reported as existing', () => {
    // Guards the inverse of the silent skip: a class the broken partial happened
    // to declare before the parse error must not leak into the result, or the
    // consumer would stop flagging a genuinely non-existent use of it.
    write('_broken.scss', '.bad { color: red;');
    const module = write('M.module.scss', `@use 'broken';`);

    expect(collectPartialClasses(module).has('bad')).toBe(false);
    expect(collectPartialClasses(module).size).toBe(0);
  });
});
