import type { ClassAncestry } from './extractCssClasses/index.js';

/**
 * Given the set of classes already considered used and the ampersand-family
 * ancestry map, add every ancestor of a used class to the used set.
 *
 * Rationale: SCSS suffix concatenation (`.--orientation { &-horizontal {} }`)
 * defines a parent class (`--orientation`) that carries the shared declarations
 * its children inherit, but source code typically references only the concrete
 * children (`s[`--orientation-${v}`]`). Without this, the structurally-required
 * parent is falsely reported as unused. A used child therefore rescues every
 * ancestor on its concatenation path up to the family root.
 *
 * The walk is append-only (a class is never removed from `usedClasses`) and is
 * guarded against revisiting a class, so it terminates even though SCSS cannot
 * actually produce a cycle.
 */
export const rescueUsedAncestors = (
  usedClasses: Set<string>,
  ancestry: ClassAncestry
): void => {
  const ancestorsToRescue = new Set<string>();

  for (const className of usedClasses) {
    let parent = ancestry.get(className);
    while (
      parent !== undefined &&
      !usedClasses.has(parent) &&
      !ancestorsToRescue.has(parent)
    ) {
      ancestorsToRescue.add(parent);
      parent = ancestry.get(parent);
    }
  }

  for (const ancestor of ancestorsToRescue) {
    usedClasses.add(ancestor);
  }
};
