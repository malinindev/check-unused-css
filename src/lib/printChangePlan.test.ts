import { describe, expect, test } from 'bun:test';
import { buildChangePlan } from './applyChangePlan/index.js';
import { printChangePlan } from './printChangePlan.js';

const capture = (cssSource: string, unused: string[]): string[] => {
  const plan = buildChangePlan({
    perFile: [
      {
        file: '/virtual/demo.module.scss',
        cssSource,
        unusedClassNames: unused,
      },
    ],
  });
  const lines: string[] = [];
  printChangePlan(plan, { writeLine: (l) => lines.push(l), cwd: '/virtual' });
  return lines;
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI codes inherently requires matching the ESC control character.
const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

describe('printChangePlan', () => {
  test('remove-only plan', () => {
    const lines = capture('.unused { color: red }', ['unused']).map(stripAnsi);
    expect(lines[0]).toBe('Plan · 1 file · 1 change');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('  demo.module.scss');
    expect(lines[3]).toBe('    L1  remove  .unused');
  });

  test('strip-only plan', () => {
    const lines = capture('.used, .unused, .other { color: red }', [
      'unused',
    ]).map(stripAnsi);
    expect(lines[0]).toBe('Plan · 1 file · 1 change');
    expect(lines[2]).toBe('  demo.module.scss');
    expect(lines[3]).toBe('    L1  strip   .unused  →  .used, .other');
  });

  test('multi-class strip lists every dead selector in the output', () => {
    const lines = capture('.azaza, .modal, .test:hover { color: blue }', [
      'azaza',
      'test',
    ]).map(stripAnsi);
    expect(lines[3]).toBe('    L1  strip   .azaza, .test:hover  →  .modal');
  });

  test('collapses a multi-line authored selector into one line in the plan output', () => {
    const source = `.azaza,\n.modal,\n.test:hover { color: blue }`;
    const lines = capture(source, ['azaza', 'test']).map(stripAnsi);
    expect(lines[3]).toBe('    L1  strip   .azaza, .test:hover  →  .modal');
  });

  test('warn-only plan (no edits)', () => {
    const lines = capture('.wrapper .unused { color: red }', ['unused']).map(
      stripAnsi
    );
    expect(lines[0]).toContain(
      'Could not auto-remove — these selectors are too complex to verify. Please review manually:'
    );
    expect(lines[1]).toBe('  demo.module.scss:1  .wrapper .unused');
  });

  test('mixed plan (remove + strip + warn) with aligned line numbers', () => {
    const source = `
.unused { color: a }
.used, .unused { color: b }
.wrapper .unused { color: c }
`.trim();
    const lines = capture(source, ['unused']).map(stripAnsi);
    expect(lines[0]).toBe('Plan · 1 file · 2 changes');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('  demo.module.scss');
    expect(lines[3]).toBe('    L1  remove  .unused');
    expect(lines[4]).toBe('    L2  strip   .unused  →  .used');
    expect(lines[5]).toBe('');
    expect(lines[6]).toContain('Could not auto-remove');
    expect(lines[7]).toBe('  demo.module.scss:3  .wrapper .unused');
  });

  test('line numbers pad to common width per file', () => {
    const rules = Array.from(
      { length: 12 },
      (_, i) => `.rule${i} { color: red }`
    ).join('\n');
    const source = `${rules}\n.unusedA { color: blue }`;
    // .unusedA is on line 13; give it a second-class companion on line 1
    // so we get both single- and double-digit line numbers.
    const withExtra = `.unusedA { color: a }\n${rules}\n.unusedB { color: c }`;
    const lines = capture(withExtra, ['unusedA', 'unusedB']).map(stripAnsi);
    // Both edits should be padded to width 2 ("L 1", "L14").
    expect(lines[3]).toBe('    L 1  remove  .unusedA');
    expect(lines[4]).toBe('    L14  remove  .unusedB');
    // keep `source` referenced so linters don't flag it
    expect(source.length).toBeGreaterThan(0);
  });

  test('parse-errors-only plan prints the skipped block and no Plan header', () => {
    const lines: string[] = [];
    printChangePlan(
      {
        mode: 'remove',
        files: [],
        parseErrors: [
          { file: '/virtual/bad.module.scss', message: 'unexpected token }}}' },
        ],
        internalErrors: [],
      },
      { writeLine: (l) => lines.push(l), cwd: '/virtual' }
    );
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toBe('Could not parse 1 file — they will be skipped:');
    expect(stripped[1]).toBe('  bad.module.scss  unexpected token }}}');
    expect(stripped.some((l) => l.startsWith('Plan ·'))).toBe(false);
  });

  test('parse-errors block prints BEFORE the Plan header when both are present', () => {
    const lines: string[] = [];
    printChangePlan(
      {
        mode: 'remove',
        files: [
          {
            file: '/virtual/good.module.scss',
            root: {} as never,
            originalSource: '',
            edits: [
              {
                kind: 'remove',
                file: '/virtual/good.module.scss',
                className: 'unused',
                rule: {} as never,
                originalSelector: '.unused',
                line: 1,
              },
            ],
            warnings: [],
          },
        ],
        parseErrors: [
          { file: '/virtual/bad.module.scss', message: 'boom' },
          { file: '/virtual/bad2.module.scss', message: 'boom2' },
        ],
        internalErrors: [],
      },
      { writeLine: (l) => lines.push(l), cwd: '/virtual' }
    );
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toBe('Could not parse 2 files — they will be skipped:');
    const parseIdx = stripped.findIndex((l) => l.startsWith('Could not parse'));
    const planIdx = stripped.findIndex((l) => l.startsWith('Plan ·'));
    expect(parseIdx).toBeGreaterThanOrEqual(0);
    expect(planIdx).toBeGreaterThan(parseIdx);
  });

  test('internal-errors block is distinct from parse-errors in the output', () => {
    const lines: string[] = [];
    printChangePlan(
      {
        mode: 'remove',
        files: [],
        parseErrors: [],
        internalErrors: [
          {
            file: '/virtual/weird.module.scss',
            message: 'effective/authored mismatch',
          },
        ],
      },
      { writeLine: (l) => lines.push(l), cwd: '/virtual' }
    );
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toBe(
      'Internal error while planning 1 file — they will be skipped (please file a bug):'
    );
    expect(stripped[1]).toBe(
      '  weird.module.scss  effective/authored mismatch'
    );
  });

  test('empty plan prints a friendly message', () => {
    const lines = capture('.used { color: red }', ['unused']).map(stripAnsi);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Nothing to remove.');
  });
});
