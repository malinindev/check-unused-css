import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCheckUnusedCss } from './runCheckUnusedCss.js';

describe('Source file scan', () => {
  let tmp: string | null = null;

  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  });

  test('skips the source scan when no CSS module is analyzed', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scuc-source-scan-'));
    // A broken tsconfig warns as soon as an import is resolved, so the warning
    // shows whether the source files were scanned at all.
    fs.writeFileSync(path.join(tmp, 'tsconfig.json'), '{ "extends": 42 }');
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(
      path.join(tmp, 'src/App.tsx'),
      "import styles from 'styles/App.module.css';\n"
    );

    const result = runCheckUnusedCss({ cwd: tmp, stdin: 'closed' });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain('tsconfig path aliases');
  });
});
