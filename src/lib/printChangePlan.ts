import { COLORS } from '../consts.js';
import type { ChangePlan, FilePlan } from './applyChangePlan/index.js';
import { plural, toRel } from './printUtils.js';

type PrintOptions = {
  /** Defaults to console.log — override in tests. */
  writeLine?: (line: string) => void;
  /** Root to make paths relative against in output. Default: process.cwd(). */
  cwd?: string;
};

// Collapse any newlines + surrounding whitespace in the authored selector
// to single spaces so a plan line renders on a single row.
const oneLine = (selector: string): string =>
  selector.replace(/\s*\n\s*/g, ' ').trim();

export const printChangePlan = (
  plan: ChangePlan,
  options: PrintOptions = {}
): void => {
  const write = options.writeLine ?? ((line: string) => console.log(line));
  const cwd = options.cwd ?? process.cwd();

  const filesWithEdits = plan.files.filter((f) => f.edits.length > 0);
  const filesWithWarnings = plan.files.filter((f) => f.warnings.length > 0);

  if (
    filesWithEdits.length === 0 &&
    filesWithWarnings.length === 0 &&
    plan.parseErrors.length === 0 &&
    plan.internalErrors.length === 0
  ) {
    write(`${COLORS.green}Nothing to remove.${COLORS.reset}`);
    return;
  }

  if (plan.parseErrors.length > 0) {
    write(
      `${COLORS.red}Could not parse ${plural(plan.parseErrors.length, 'file')} — they will be skipped:${COLORS.reset}`
    );
    for (const pe of plan.parseErrors) {
      write(
        `  ${COLORS.cyan}${toRel(pe.file, cwd)}${COLORS.reset}  ${pe.message}`
      );
    }
    write('');
  }

  if (plan.internalErrors.length > 0) {
    write(
      `${COLORS.red}Internal error while planning ${plural(plan.internalErrors.length, 'file')} — they will be skipped (please file a bug):${COLORS.reset}`
    );
    for (const ie of plan.internalErrors) {
      write(
        `  ${COLORS.cyan}${toRel(ie.file, cwd)}${COLORS.reset}  ${ie.message}`
      );
    }
    write('');
  }

  if (filesWithEdits.length > 0) {
    const totalChanges = filesWithEdits.reduce(
      (acc, fp) => acc + fp.edits.length,
      0
    );
    write(
      `Plan · ${plural(filesWithEdits.length, 'file')} · ${plural(totalChanges, 'change')}`
    );
    write('');
    for (const fp of filesWithEdits) {
      printFileEdits(fp, cwd, write);
    }
    write('');
  }

  if (filesWithWarnings.length > 0) {
    write(
      `${COLORS.yellow}Could not auto-remove — these selectors are too complex to verify. Please review manually:${COLORS.reset}`
    );
    for (const fp of filesWithWarnings) {
      printFileWarnings(fp, cwd, write);
    }
    write('');
  }
};

const printFileEdits = (
  fp: FilePlan,
  cwd: string,
  write: (line: string) => void
): void => {
  write(`  ${COLORS.cyan}${toRel(fp.file, cwd)}${COLORS.reset}`);
  const maxLineWidth = Math.max(...fp.edits.map((e) => String(e.line).length));
  // Render action labels padded to a common width so selector columns align.
  // `remove` = 6 chars, `strip` = 5 chars → pad strip with a trailing space.
  const remove = `${COLORS.red}remove${COLORS.reset}`;
  const strip = `${COLORS.yellow}strip ${COLORS.reset}`;
  const arrow = `${COLORS.green}→${COLORS.reset}`;

  for (const edit of fp.edits) {
    const lineLabel = `${COLORS.cyan}L${String(edit.line).padStart(maxLineWidth)}${COLORS.reset}`;
    if (edit.kind === 'remove') {
      write(`    ${lineLabel}  ${remove}  .${edit.className}`);
    } else {
      write(
        `    ${lineLabel}  ${strip}  ${edit.deadSelectors.join(', ')}  ${arrow}  ${edit.survivingSelector}`
      );
    }
  }
};

const printFileWarnings = (
  fp: FilePlan,
  cwd: string,
  write: (line: string) => void
): void => {
  for (const warn of fp.warnings) {
    write(
      `  ${COLORS.cyan}${toRel(fp.file, cwd)}:${warn.line}${COLORS.reset}  ${oneLine(warn.originalSelector)}`
    );
  }
};
