import type { Root, Rule } from 'postcss';

/**
 * A rule-level intent: what the tool plans to do with one postcss.Rule for one
 * unused class name. Candidates are NOT serializable — they carry a live AST
 * reference that is mutated during the apply phase.
 */
export type Candidate =
  | {
      kind: 'remove';
      file: string;
      className: string;
      rule: Rule;
      originalSelector: string;
      line: number;
    }
  | {
      kind: 'stripSelectors';
      file: string;
      className: string;
      rule: Rule;
      originalSelector: string;
      line: number;
      deadSelectors: string[];
      survivingSelector: string;
    }
  | {
      kind: 'warn';
      file: string;
      className: string;
      rule: Rule;
      originalSelector: string;
      line: number;
    };

/** All planned work for a single file. Keeps the parsed AST alive between
 *  buildChangePlan and applyChangePlan so mutations land on the same tree. */
export type FilePlan = {
  file: string;
  root: Root;
  originalSource: string;
  edits: Array<Extract<Candidate, { kind: 'remove' | 'stripSelectors' }>>;
  warnings: Array<Extract<Candidate, { kind: 'warn' }>>;
};

/** Aggregate intent across every file in the run. */
export type ChangePlan = {
  mode: 'remove';
  files: FilePlan[];
  /** Real CSS/SCSS parse failures — the file's source is unreadable. */
  parseErrors: Array<{ file: string; message: string }>;
  /**
   * Bugs or invariant violations caught while building the plan (distinct
   * from parseErrors so the UI never mislabels an internal assertion as
   * "failed to parse"). The file is skipped defensively.
   */
  internalErrors: Array<{ file: string; message: string }>;
};

/** Per-file outcome produced by the writer. */
export type EditResult = {
  file: string;
  status: 'written' | 'skipped' | 'failed';
  rulesRemoved: number;
  selectorsStripped: number;
  emptied: boolean;
  skipReason?: string;
};

/** Aggregate summary the final printer consumes. */
export type RunSummary = {
  mode: ChangePlan['mode'];
  filesModified: number;
  rulesRemoved: number;
  selectorsStripped: number;
  filesEmptied: number;
  filesSkipped: Array<{ file: string; reason: string }>;
  warnings: Array<Extract<Candidate, { kind: 'warn' }>>;
  declinedByUser: boolean;
};
