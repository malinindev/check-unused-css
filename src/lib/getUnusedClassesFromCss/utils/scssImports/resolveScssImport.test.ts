import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { resolveScssImport } from './resolveScssImport.js';

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-scss-'));
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pkg'), { recursive: true });

  fs.writeFileSync(path.join(root, '_partial.scss'), '.p {}');
  fs.writeFileSync(path.join(root, 'plain.scss'), '.q {}');
  fs.writeFileSync(path.join(root, 'styles.css'), '.r {}');
  fs.writeFileSync(path.join(root, 'sub', '_nested.scss'), '.n {}');
  fs.writeFileSync(path.join(root, 'pkg', '_index.scss'), '.i {}');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('resolveScssImport', () => {
  test('resolves a partial by its underscore name', () => {
    expect(resolveScssImport('partial', root)).toBe(
      path.join(root, '_partial.scss')
    );
  });

  test('resolves a non-underscore file', () => {
    expect(resolveScssImport('plain', root)).toBe(
      path.join(root, 'plain.scss')
    );
  });

  test('resolves an explicit extension by stripping then re-trying the partial rules', () => {
    expect(resolveScssImport('partial.scss', root)).toBe(
      path.join(root, '_partial.scss')
    );
  });

  test('resolves a .css file', () => {
    expect(resolveScssImport('styles', root)).toBe(
      path.join(root, 'styles.css')
    );
  });

  test('resolves a partial inside a subdirectory', () => {
    expect(resolveScssImport('sub/nested', root)).toBe(
      path.join(root, 'sub', '_nested.scss')
    );
  });

  test('resolves a directory to its _index file', () => {
    expect(resolveScssImport('pkg', root)).toBe(
      path.join(root, 'pkg', '_index.scss')
    );
  });

  test('returns null for a missing partial', () => {
    expect(resolveScssImport('does-not-exist', root)).toBeNull();
  });

  test('prefers the underscore partial over a directory index of the same name', () => {
    // `_partial.scss` exists; no `partial/` dir — must still resolve the file.
    expect(resolveScssImport('partial', root)).toBe(
      path.join(root, '_partial.scss')
    );
  });
});
