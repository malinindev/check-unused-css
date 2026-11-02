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

  test.each([
    ['there are no CSS modules', false],
    ['every CSS module is skipped', true],
  ])('skips the source scan when %s', (_case, withSkippedModule) => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scuc-source-scan-'));
    // A broken tsconfig warns as soon as an import is resolved, so the warning
    // shows whether the source files were scanned at all.
    fs.writeFileSync(path.join(tmp, 'tsconfig.json'), '{ "extends": 42 }');
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(
      path.join(tmp, 'src/App.tsx'),
      "import styles from 'styles/App.module.css';\n"
    );
    if (withSkippedModule) {
      // A directory matches the module glob but is skipped as "not a file".
      fs.mkdirSync(path.join(tmp, 'src/Skipped.module.css'));
    }

    const result = runCheckUnusedCss({ cwd: tmp, stdin: 'closed' });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain('tsconfig path aliases');
  });
});
