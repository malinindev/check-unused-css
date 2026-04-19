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
    expect(lines[0]).toBe('Done · 2 files modified · 3 rules removed');
  });

  test('singular units pluralize correctly', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 1,
      rulesRemoved: 1,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: false,
    });
    expect(lines[0]).toBe('Done · 1 file modified · 1 rule removed');
  });

  test('"Heads up" safety line appears after Done but NOT on decline/warn-only/nothing/skipped paths', () => {
    const activity = capture({
      mode: 'remove',
      filesModified: 1,
      rulesRemoved: 1,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: false,
    });
    expect(activity.some((l) => l.startsWith('Heads up:'))).toBe(true);

    const declined = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: true,
    });
    expect(declined.some((l) => l.includes('Heads up'))).toBe(false);

    const warnOnly = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [mkWarn('/virtual/a.scss', '.wrapper .unused', 12)],
      declinedByUser: false,
    });
    expect(warnOnly.some((l) => l.includes('Heads up'))).toBe(false);

    const nothing = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [],
      declinedByUser: false,
    });
    expect(nothing.some((l) => l.includes('Heads up'))).toBe(false);
  });

  test('mixed summary: removes + strips + emptied (warnings are NOT repeated here)', () => {
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
      'Done · 1 file modified · 2 rules removed · 1 selector stripped · 1 file emptied'
    );
    // Warnings were already shown by printChangePlan; don't duplicate them.
    expect(lines.some((l) => l.includes('a.scss:12'))).toBe(false);
    expect(lines.some((l) => l.includes('.wrapper .unused'))).toBe(false);
  });

  test('warn-only run with no edits → points back to the preview', () => {
    const lines = capture({
      mode: 'remove',
      filesModified: 0,
      rulesRemoved: 0,
      selectorsStripped: 0,
      filesEmptied: 0,
      filesSkipped: [],
      warnings: [mkWarn('/virtual/a.scss', '.wrapper .unused', 12)],
      declinedByUser: false,
    });
    expect(lines).toEqual(['No automatic changes — see Manual review above.']);
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
