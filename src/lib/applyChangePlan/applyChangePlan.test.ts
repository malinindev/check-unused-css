import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyChangePlan } from './applyChangePlan.js';
import { buildChangePlan } from './buildChangePlan.js';

describe('applyChangePlan', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-plan-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeFixture = (name: string, source: string): string => {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, source, 'utf-8');
    return p;
  };

  const buildAndApply = (file: string, source: string, unused: string[]) => {
    const plan = buildChangePlan({
      perFile: [{ file, cssSource: source, unusedClassNames: unused }],
    });
    return applyChangePlan(plan);
  };

  test('success path: removes a rule and writes the file', () => {
    const source = `.used { color: blue }\n.unused { color: red }\n`;
    const file = writeFixture('a.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('written');
    expect(results[0]?.rulesRemoved).toBe(1);
    expect(results[0]?.selectorsStripped).toBe(0);
    expect(results[0]?.emptied).toBe(false);

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).toContain('.used');
    expect(after).not.toContain('.unused');
  });

  test('emptied flag true when every rule is removed', () => {
    const source = `.unused { color: red }\n`;
    const file = writeFixture('empty.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);

    expect(results[0]?.status).toBe('written');
    expect(results[0]?.emptied).toBe(true);
    expect(fs.readFileSync(file, 'utf-8').trim()).toBe('');
  });

  test('shared-list stripping produces a single write with body intact', () => {
    const source = `.used, .unused, .other { color: red }\n`;
    const file = writeFixture('shared.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);

    expect(results[0]?.status).toBe('written');
    expect(results[0]?.rulesRemoved).toBe(0);
    expect(results[0]?.selectorsStripped).toBe(1);

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).toContain('.used');
    expect(after).toContain('.other');
    expect(after).not.toMatch(/\.unused/);
    expect(after).toContain('color: red');
  });

  test('non-simple rule only → no writes (skipped because no edits)', () => {
    const source = `.wrapper .unused { color: red }\n`;
    const file = writeFixture('warn.module.scss', source);

    const plan = buildChangePlan({
      perFile: [{ file, cssSource: source, unusedClassNames: ['unused'] }],
    });
    const results = applyChangePlan(plan);

    // plan.files still contains the FilePlan, but edits is empty → skipped.
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('skipped');
    expect(fs.readFileSync(file, 'utf-8')).toBe(source);
  });

  test('preserves surrounding whitespace and comments byte-for-byte', () => {
    const source = `/* top comment */

.used {
  color: blue;
}

/* spacer */

.unused {
  color: red;
}

.other {
  color: green;
}
`;
    const file = writeFixture('preserve.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);
    expect(results[0]?.status).toBe('written');

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).toContain('/* top comment */');
    expect(after).toContain('/* spacer */');
    expect(after).toContain('.used {');
    expect(after).toContain('.other {');
    expect(after).not.toContain('.unused');
  });

  test('does not mutate the file when called on a file outside the plan', () => {
    const source = `.used { color: blue }\n`;
    const file = writeFixture('untouched.module.scss', source);

    const plan = buildChangePlan({
      perFile: [
        {
          file: path.join(tmpDir, 'other.module.scss'),
          cssSource: source,
          unusedClassNames: ['unused'],
        },
      ],
    });
    applyChangePlan(plan);

    expect(fs.readFileSync(file, 'utf-8')).toBe(source);
  });

  test('continues past a failing file to process the rest (FR-011)', () => {
    const goodSource = `.used { color: blue }\n.unused { color: red }\n`;
    const goodFile = writeFixture('good.module.scss', goodSource);
    const ghostFile = path.join(tmpDir, 'does', 'not', 'exist.module.scss');

    const plan = buildChangePlan({
      perFile: [
        {
          file: ghostFile,
          cssSource: '.unused { color: red }',
          unusedClassNames: ['unused'],
        },
        {
          file: goodFile,
          cssSource: goodSource,
          unusedClassNames: ['unused'],
        },
      ],
    });

    const results = applyChangePlan(plan);

    expect(results).toHaveLength(2);
    const ghost = results.find((r) => r.file === ghostFile);
    const good = results.find((r) => r.file === goodFile);
    expect(ghost).toBeDefined();
    expect(good).toBeDefined();
    expect(ghost?.status).toBe('failed');
    expect(ghost?.skipReason).toBeTruthy();
    expect(good?.status).toBe('written');
    expect(fs.readFileSync(goodFile, 'utf-8')).not.toContain('.unused');
  });

  test('remove+strip for two unused classes in the same file (different rules)', () => {
    const source = `
.useless { color: a }
.used, .other-useless, .stays { color: b }
.kept { color: c }
`.trim();
    const file = writeFixture('multi.module.scss', source);

    const plan = buildChangePlan({
      perFile: [
        {
          file,
          cssSource: source,
          unusedClassNames: ['useless', 'other-useless'],
        },
      ],
    });
    const results = applyChangePlan(plan);

    expect(results[0]?.status).toBe('written');
    expect(results[0]?.rulesRemoved).toBe(1);
    expect(results[0]?.selectorsStripped).toBe(1);

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).not.toMatch(/\.useless\s*\{/);
    expect(after).not.toMatch(/\.other-useless/);
    expect(after).toMatch(/\.used,\s*\.stays/);
    expect(after).toContain('.kept');
  });
});
