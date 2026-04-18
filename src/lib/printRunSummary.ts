import { COLORS } from '../consts.js';
import type { RunSummary } from './applyChangePlan/index.js';
import { plural, toRel } from './printUtils.js';

type PrintOptions = {
  writeLine?: (line: string) => void;
  cwd?: string;
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

  if (hasActivity) {
    const parts: string[] = [
      `${plural(summary.filesModified, 'file')} modified`,
      `${plural(summary.rulesRemoved, 'rule')} removed`,
    ];
    if (summary.selectorsStripped > 0) {
      parts.push(`${plural(summary.selectorsStripped, 'selector')} stripped`);
    }
    if (summary.filesEmptied > 0) {
      parts.push(`${plural(summary.filesEmptied, 'file')} emptied`);
    }
    write(`${COLORS.green}Done${COLORS.reset} · ${parts.join(' · ')}`);
    write(
      `${COLORS.yellow}Heads up:${COLORS.reset} double-check every removal — this operation rewrites your source files and can drop rules that were only referenced dynamically.`
    );
  } else if (summary.warnings.length > 0) {
    // Manual-review rules were already printed by printChangePlan as part of
    // the preview; don't repeat them here. Just tell the user nothing was
    // written and point back to the preview.
    write(
      `${COLORS.yellow}No automatic changes — see Manual review above.${COLORS.reset}`
    );
  } else if (summary.filesSkipped.length === 0) {
    write(`${COLORS.green}Nothing to remove.${COLORS.reset}`);
  }

  if (summary.filesSkipped.length > 0) {
    write('');
    write(`${COLORS.yellow}Skipped:${COLORS.reset}`);
    for (const skipped of summary.filesSkipped) {
      write(`  ${toRel(skipped.file, cwd)} — ${skipped.reason}`);
    }
  }
};
