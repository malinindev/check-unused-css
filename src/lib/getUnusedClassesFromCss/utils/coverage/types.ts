/**
 * Classification of a single `styles[...]` / `styles.foo` access site, used to
 * decide which CSS-module class names it could possibly reference at runtime.
 *
 * - `literals`: the exact, statically-known set of class names
 *   (`styles.foo`, `styles['foo']`, `styles[cond ? 'a' : 'b']`).
 * - `pattern`: a template with at least one constant segment
 *   (`` styles[`btn-${x}`] ``); `regex` matches a class name iff the template
 *   could produce it (every `${...}` is a `.*` wildcard).
 * - `coversAll`: the expression could resolve to any class name (bare variable,
 *   call, concatenation, template without constants, ternary with a non-literal
 *   branch). Conservative: suppresses unused-checking for the whole module.
 */
export type AccessClassification =
  | { kind: 'literals'; classNames: string[] }
  | { kind: 'pattern'; regex: RegExp; source: string; segments: string[] }
  | { kind: 'coversAll' };

/** A classified access site together with its location, for reporting. */
export type ClassAccess = {
  classification: AccessClassification;
  /** Reconstructed `styles[expr]` text, used only for `coversAll` reporting. */
  display: string;
  /** Source file the access was found in (for `coversAll` reporting). */
  file: string;
  /** 1-based line of the access. */
  line: number;
  /** 1-based column of the import identifier (e.g. `styles`), matching the
   * pre-existing dynamic-usage report format. */
  column: number;
};

/** Result of aggregating every access site of a CSS module across all files. */
export type CoverageOutcome = {
  /** Class names covered statically or by a pattern, across the whole module. */
  coveredClasses: Set<string>;
  /** True if any access anywhere covers all classes (absorbing). */
  coversAll: boolean;
  /** The `coversAll` access sites, retained for `--no-dynamic` reporting. */
  coversAllAccesses: ClassAccess[];
};
