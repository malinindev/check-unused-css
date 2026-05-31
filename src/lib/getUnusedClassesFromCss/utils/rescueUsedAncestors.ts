import type { ClassAncestry } from './extractCssClasses/index.js';

/**
 * Mark the ancestors of every used class as used too.
 *
 * SCSS suffix concatenation (`.--orientation { &-horizontal {} }`) defines a
 * parent class that source rarely names directly — it usually references only
 * the children. So a used child rescues its whole ancestor chain, otherwise the
 * parent looks unused. Append-only and revisit-guarded, so it always finishes.
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
