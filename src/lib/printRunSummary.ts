import path from 'node:path';
import { COLORS } from '../consts.js';
import type { RunSummary } from './applyChangePlan/index.js';

type PrintOptions = {
  writeLine?: (line: string) => void;
  cwd?: string;
};

const toRel = (file: string, cwd: string): string => {
  const rel = path.relative(cwd, file);
  return rel === '' ? file : rel;
};

export const printRunSummary = (
  summary: RunSummary,
  options: PrintOptions = {}
): void => {
  const write = options.writeLine ?? ((line: string) => console.log(line));
  const cwd = options.cwd ?? process.cwd();

  if (summary.declinedByUser) {
    write(`${COLORS.yellow}No changes written.${COLORS.reset}`);
    return;
  }

  const hasActivity =
    summary.filesModified > 0 ||
    summary.rulesRemoved > 0 ||
    summary.selectorsStripped > 0 ||
    summary.filesEmptied > 0;

  if (
    !hasActivity &&
    summary.warnings.length === 0 &&
    summary.filesSkipped.length === 0
  ) {
    write(`${COLORS.green}Nothing to remove.${COLORS.reset}`);
    return;
  }

  if (hasActivity) {
    const parts: string[] = [
      `Modified ${summary.filesModified} file(s)`,
      `removed ${summary.rulesRemoved} rule(s)`,
    ];
    if (summary.selectorsStripped > 0) {
      parts.push(`stripped ${summary.selectorsStripped} selector(s)`);
    }
    if (summary.filesEmptied > 0) {
      parts.push(`${summary.filesEmptied} file(s) now empty`);
    }
    write(`${COLORS.green}${parts.join(', ')}.${COLORS.reset}`);
  }

  if (summary.filesSkipped.length > 0) {
    write('');
    write(`${COLORS.yellow}Skipped:${COLORS.reset}`);
    for (const skipped of summary.filesSkipped) {
      write(`  ${toRel(skipped.file, cwd)} — ${skipped.reason}`);
    }
  }

  if (summary.warnings.length > 0) {
    write('');
    write(
      `${COLORS.yellow}Manual review (${summary.warnings.length} rule(s) left for manual inspection):${COLORS.reset}`
    );
    for (const warn of summary.warnings) {
      write(
        `  ${COLORS.cyan}${toRel(warn.file, cwd)}:${warn.line}${COLORS.reset}  ${warn.originalSelector}`
      );
    }
  }
};
