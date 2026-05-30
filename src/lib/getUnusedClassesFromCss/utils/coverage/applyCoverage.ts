import type { ClassAccess, CoverageOutcome } from './types.js';

/**
 * Aggregate every access site of a CSS module (gathered across all importing
 * files) into the set of covered classes and a module-level `coversAll` flag.
 *
 * Coverage is additive across files (a class is covered if covered anywhere),
 * and `coversAll` is absorbing: a single covers-all access anywhere means the
 * whole module is not checked for unused classes (the conservative rule wins).
 */
export const applyCoverage = (
  cssClasses: string[],
  accesses: ClassAccess[]
): CoverageOutcome => {
  const coveredClasses = new Set<string>();
  const coversAllAccesses: ClassAccess[] = [];
  let coversAll = false;

  for (const access of accesses) {
    const { classification } = access;

    if (classification.kind === 'literals') {
      for (const name of classification.classNames) {
        coveredClasses.add(name);
      }
    } else if (classification.kind === 'pattern') {
      for (const name of cssClasses) {
        if (classification.regex.test(name)) {
          coveredClasses.add(name);
        }
      }
    } else {
      coversAll = true;
      coversAllAccesses.push(access);
    }
  }

  return { coveredClasses, coversAll, coversAllAccesses };
};
