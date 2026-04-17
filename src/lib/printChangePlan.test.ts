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
    expect(lines[0]).toBe('Plan:');
    expect(lines[1]).toBe('  demo.module.scss');
    expect(lines[2]).toBe('    remove .unused (line 1)');
    expect(lines[3]).toBe('');
  });

  test('strip-only plan', () => {
    const lines = capture('.used, .unused, .other { color: red }', [
      'unused',
    ]).map(stripAnsi);
    expect(lines[0]).toBe('Plan:');
    expect(lines[1]).toBe('  demo.module.scss');
    expect(lines[2]).toBe(
      '    strip .unused from `.used, .unused, .other` (line 1) → `.used, .other`'
    );
  });

  test('warn-only plan (no edits)', () => {
    const lines = capture('.wrapper .unused { color: red }', ['unused']).map(
      stripAnsi
    );
    expect(lines[0]).toContain(
      'Manual review (unused class referenced in a non-leading selector position):'
    );
    expect(lines[1]).toBe('  demo.module.scss:1  .wrapper .unused');
  });

  test('mixed plan (remove + strip + warn)', () => {
    const source = `
.unused { color: a }
.used, .unused { color: b }
.wrapper .unused { color: c }
`.trim();
    const lines = capture(source, ['unused']).map(stripAnsi);
    // Plan header + file + 2 edits + blank + warn header + 1 warn + blank
    expect(lines[0]).toBe('Plan:');
    expect(lines[1]).toBe('  demo.module.scss');
    expect(lines[2]).toBe('    remove .unused (line 1)');
    expect(lines[3]).toBe(
      '    strip .unused from `.used, .unused` (line 2) → `.used`'
    );
    expect(lines[4]).toBe('');
    expect(lines[5]).toContain('Manual review');
    expect(lines[6]).toBe('  demo.module.scss:3  .wrapper .unused');
  });

  test('empty plan prints a friendly message', () => {
    const lines = capture('.used { color: red }', ['unused']).map(stripAnsi);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Nothing to remove.');
  });
});
