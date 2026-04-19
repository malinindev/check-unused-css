import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postcssScss from 'postcss-scss';
import { applyChangePlan, normalizeLeadingBlanks } from './applyChangePlan.js';
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

  test('when second file fails, the first file keeps its written content', () => {
    const goodSource = `.used { color: blue }\n.unused { color: red }\n`;
    const goodFile = writeFixture('first.module.scss', goodSource);
    const ghostFile = path.join(tmpDir, 'nope', 'second.module.scss');

    const plan = buildChangePlan({
      perFile: [
        {
          file: goodFile,
          cssSource: goodSource,
          unusedClassNames: ['unused'],
        },
        {
          file: ghostFile,
          cssSource: '.unused { color: red }',
          unusedClassNames: ['unused'],
        },
      ],
    });
    const results = applyChangePlan(plan);

    expect(results[0]?.file).toBe(goodFile);
    expect(results[0]?.status).toBe('written');
    expect(results[1]?.file).toBe(ghostFile);
    expect(results[1]?.status).toBe('failed');

    // First file keeps its mutated contents — no implicit rollback across files.
    const after = fs.readFileSync(goodFile, 'utf-8');
    expect(after).toContain('.used');
    expect(after).not.toContain('.unused');
  });

  test('normalizeLeadingBlanks: CRLF source keeps CRLF line endings while collapsing blank lines', () => {
    // Build an AST with CRLF line endings so we can verify the regex handles
    // both `\n` and `\r\n` without leaking LF into a CRLF file.
    const root = postcssScss.parse(
      '@media x {\r\n  .a { }\r\n\r\n  .b { }\r\n}\r\n'
    );
    // Remove .a so .b becomes the first child — its raws.before now holds
    // the blank-line sequence that normalizeLeadingBlanks is meant to fix.
    root.walkRules((rule) => {
      if (rule.selector === '.a') rule.remove();
    });
    normalizeLeadingBlanks(root);
    const out = root.toString();
    // No double CRLF after the opening brace:
    expect(out).not.toMatch(/\{\r\n\r\n/);
    // CRLF preserved somewhere in the output (i.e. we didn't downgrade to LF):
    expect(out).toContain('\r\n');
  });

  test('normalizeLeadingBlanks: empty container after removal does not crash', () => {
    const root = postcssScss.parse('@media x { .only { color: red } }');
    root.walkRules((rule) => {
      if (rule.selector === '.only') rule.remove();
    });
    expect(() => normalizeLeadingBlanks(root)).not.toThrow();
  });

  test('removing the first child of a container does not leave a blank line after `{`', () => {
    const source = `@media (hover: hover) {
  .unused {
    color: red;
  }

  .kept {
    color: blue;
  }
}
`;
    const file = writeFixture('blanks.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);
    expect(results[0]?.status).toBe('written');

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).not.toContain('.unused');
    // No double-newline directly after `@media (hover: hover) {`.
    expect(after).not.toMatch(/\{\s*\n\s*\n\s*\.kept/);
    expect(after).toMatch(/@media \(hover: hover\) \{\n\s+\.kept/);
  });

  test('preserves a comment directly preceding a removed rule', () => {
    const source = `.used { color: blue; }\n\n/* doc for removed rule — should survive */\n.unused { color: red; }\n`;
    const file = writeFixture('adjacent.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);
    expect(results[0]?.status).toBe('written');

    const after = fs.readFileSync(file, 'utf-8');
    // Rule gone, its body gone:
    expect(after).not.toMatch(/\.unused\s*\{/);
    expect(after).not.toContain('color: red');
    // Standalone Comment node above the rule is NOT consumed by rule.remove():
    expect(after).toContain('/* doc for removed rule — should survive */');
  });

  test('write failure AFTER tmp write leaves the target file untouched and no .tmp sibling', () => {
    const source = `.used { color: blue }\n.unused { color: red }\n`;
    const file = writeFixture('rollback.module.scss', source);

    // Make the directory read-only so renameSync throws EACCES. The tmp file
    // is created in the same dir; when rename fails, unlinkSync must clean it
    // up and the original file on disk must be untouched byte-for-byte.
    const originalMode = fs.statSync(tmpDir).mode;
    try {
      fs.chmodSync(tmpDir, 0o555);

      const results = buildAndApply(file, source, ['unused']);

      expect(results[0]?.status).toBe('failed');
      expect(results[0]?.skipReason).toMatch(/failed to write/);

      // Relax permissions just enough to read back + list the dir.
      fs.chmodSync(tmpDir, 0o755);

      // Target file is byte-for-byte unchanged.
      expect(fs.readFileSync(file, 'utf-8')).toBe(source);

      // No orphan .tmp sibling left behind.
      const siblings = fs.readdirSync(tmpDir);
      const orphans = siblings.filter((n) => n.endsWith('.tmp'));
      expect(orphans).toEqual([]);
    } finally {
      // Always restore mode so afterEach rmSync can clean up.
      fs.chmodSync(tmpDir, originalMode);
    }
  });

  test('BOM + CRLF round-trip: neither encoding nor line endings change', () => {
    // \uFEFF is the UTF-8 BOM; postcss preserves it on root.raws.bom and
    // toString() restores it. Line endings in raws.before must survive the
    // removal + normalizeLeadingBlanks pass.
    const source = `\uFEFF.used {\r\n  color: blue;\r\n}\r\n\r\n.unused {\r\n  color: red;\r\n}\r\n`;
    const file = writeFixture('bom-crlf.module.scss', source);

    const results = buildAndApply(file, source, ['unused']);
    expect(results[0]?.status).toBe('written');

    const after = fs.readFileSync(file, 'utf-8');
    // BOM preserved at the very start.
    expect(after.charCodeAt(0)).toBe(0xfeff);
    // CRLF preserved, no LF-only sequence sneaked in.
    expect(after).toContain('\r\n');
    expect(after).not.toMatch(/[^\r]\n/);
    // And the removal actually happened.
    expect(after).not.toContain('.unused');
    expect(after).toContain('.used');
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
