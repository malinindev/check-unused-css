import path from 'node:path';
import { COLORS } from '../consts.js';
import type { ChangePlan, FilePlan } from './applyChangePlan/index.js';

type PrintOptions = {
  /** Defaults to console.log — override in tests. */
  writeLine?: (line: string) => void;
  /** Root to make paths relative against in output. Default: process.cwd(). */
  cwd?: string;
};

const toRel = (file: string, cwd: string): string => {
  const rel = path.relative(cwd, file);
  return rel === '' ? file : rel;
};

export const printChangePlan = (
  plan: ChangePlan,
  options: PrintOptions = {}
): void => {
  const write = options.writeLine ?? ((line: string) => console.log(line));
  const cwd = options.cwd ?? process.cwd();

  const filesWithEdits = plan.files.filter((f) => f.edits.length > 0);
  const filesWithWarnings = plan.files.filter((f) => f.warnings.length > 0);

  if (filesWithEdits.length === 0 && filesWithWarnings.length === 0) {
    write(`${COLORS.green}Nothing to remove.${COLORS.reset}`);
    return;
  }

  if (filesWithEdits.length > 0) {
    write('Plan:');
    for (const fp of filesWithEdits) {
      printFileEdits(fp, cwd, write);
    }
    write('');
  }

  if (filesWithWarnings.length > 0) {
    write(
      `${COLORS.yellow}Manual review (unused class referenced in a non-leading selector position):${COLORS.reset}`
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
  for (const edit of fp.edits) {
    if (edit.kind === 'remove') {
      write(
        `    ${COLORS.red}remove${COLORS.reset} .${edit.className} (line ${edit.line})`
      );
    } else {
      write(
        `    ${COLORS.yellow}strip${COLORS.reset} .${edit.className} from \`${edit.originalSelector}\` (line ${edit.line}) → \`${edit.survivingSelector}\``
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
      `  ${COLORS.cyan}${toRel(fp.file, cwd)}:${warn.line}${COLORS.reset}  ${warn.originalSelector}`
    );
  }
};
