import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));

const run = (folder: string, opts: Parameters<typeof runCheckUnusedCss>[0]) =>
  runCheckUnusedCss(
    typeof opts === 'object' && opts !== null
      ? { ...opts, targetPath: `src/__tests__/falsePositives/${folder}` }
      : `src/__tests__/falsePositives/${folder}`
  );

describe('whole-module-passed-to-function — flag interactions', () => {
  describe('--no-dynamic escalates an ignored module to an error', () => {
    test('PassedToFunctionUnused: exit 1 and an Error under --no-dynamic', () => {
      const result = run('PassedToFunctionUnused', { noDynamic: true });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/Error:.*passed to a function/i);
    });

    test('PassedToFunctionUnused: warning (exit 0) without --no-dynamic', () => {
      const result = run('PassedToFunctionUnused', {});

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/Warning:.*passed to a function/i);
    });
  });

  describe('--remove never removes from an ignored module', () => {
    const tmpDirs: string[] = [];

    afterEach(() => {
      while (tmpDirs.length > 0) {
        const dir = tmpDirs.pop();
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test('PassedToFunctionUnused: nothing is removed; CSS file is untouched', () => {
      const src = path.join(FIXTURES_DIR, 'PassedToFunctionUnused');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scuc-fp-remove-'));
      tmpDirs.push(tmp);
      // Mirror the fixture into `src/` inside the temp dir so the default
      // target path resolves to it.
      const targetSrc = path.join(tmp, 'src');
      fs.cpSync(src, targetSrc, { recursive: true });

      const cssPath = path.join(targetSrc, 'PassedToFunctionUnused.module.css');
      const before = fs.readFileSync(cssPath, 'utf-8');

      const result = runCheckUnusedCss({
        cwd: tmp,
        extraArgs: ['--remove', '--yes'],
      });

      const after = fs.readFileSync(cssPath, 'utf-8');
      expect(after).toBe(before);
      // No edits were applied (the module was ignored, not analyzed).
      expect(result.stdout).toMatch(/Nothing to remove\./);
    });
  });
});
