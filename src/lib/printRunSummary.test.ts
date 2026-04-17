import { describe, expect, test } from 'bun:test';
import type { Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import type { Candidate, RunSummary } from './applyChangePlan/index.js';
import { printRunSummary } from './printRunSummary.js';

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI codes inherently requires matching the ESC control character.
const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

const capture = (summary: RunSummary): string[] => {
  const lines: string[] = [];
  printRunSummary(summary, {
    writeLine: (l) => lines.push(l),
    cwd: '/virtual',
  });
  return lines.map(stripAnsi);
};

const mkWarn = (
  file: string,
  selector: string,
  line: number
): Extract<Candidate, { kind: 'warn' }> => {
  const root = postcssScss.parse(`${selector} { color: red }`);
  let rule: Rule | undefined;
  root.walkRules((r) => {
    if (!rule) rule = r;
  });
  if (!rule) throw new Error('no rule parsed');
  return {
    kind: 'warn',
    file,
    className: 'unused',
    rule,
    originalSelector: selector,
    line,
  };
};

describe('printRunSummary', () => {
  test('declined by user → single "No changes written." line', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: true,
    });
    expect(lines).toEqual(['No changes written.']);
  });

  test('nothing to do → friendly message', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: false,
    });
    expect(lines).toEqual(['Nothing to remove.']);
  });

  test('all-success summary with removes only', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 2,
      rulesRemoved: 3,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: false,
    });
    expect(lines[0]).toBe('Modified 2 file(s), removed 3 rule(s).');
  });

  test('mixed summary: removes + strips + emptied + warnings', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 1,
      rulesRemoved: 2,
      selectorsStripped: 1,
      filesEmptied: 1,
      filesSkipped: [],
      warnings: [mkWarn('/virtual/a.scss', '.wrapper .unused', 12)],
      declinedByUser: false,
    });
    expect(lines[0]).toBe(
      'Modified 1 file(s), removed 2 rule(s), stripped 1 selector(s), 1 file(s) now empty.'
    );
    // Find the warn line — color-stripping so ordering is deterministic.
    expect(lines.some((l) => l.includes('a.scss:12'))).toBe(true);
    expect(lines.some((l) => l.includes('.wrapper .unused'))).toBe(true);
  });

  test('summary with skipped files lists each skip reason', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 1,
      rulesRemoved: 1,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [{ file: '/virtual/bad.scss', reason: 'EACCES' }],
      warnings: [],
      declinedByUser: false,
    });
    expect(lines.some((l) => l.includes('Skipped:'))).toBe(true);
    expect(lines.some((l) => l.includes('bad.scss — EACCES'))).toBe(true);
  });
});
