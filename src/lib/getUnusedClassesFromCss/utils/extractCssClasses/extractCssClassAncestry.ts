import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import { extractClassNamesFromSelector } from './utils/extractClassNamesFromRule.js';
import { extractComposedClasses } from './utils/extractComposedClasses.js';
import {
  getParentClassName,
  resolveAmpersandSelector,
  SUFFIX_AMPERSAND_REGEX,
} from './utils/resolveAmpersandSelector.js';

/**
 * A child class name → its immediate parent class name, recorded only for SCSS
 * ampersand *suffix* concatenation (`.--orientation { &-horizontal {} }` →
 * `--orientation-horizontal → --orientation`; `.button { &Black {} }` →
 * `buttonBlack → button`). Multi-level nesting yields one hop per level; the
 * full chain is recovered by walking the map transitively.
 *
 * Intentionally NOT recorded:
 *  - descendant nesting (`& .child`) — `child` is unrelated to the parent,
 *  - compound modifiers (`&.--reversed`) — resolves to the standalone class
 *    `--reversed`, a separate class on the same element, not a concatenation,
 *  - any class whose resolved name is not the parent name plus a suffix — this
 *    keeps the relationship derived from the real concatenation rather than
 *    loose name-prefix matching.
 */
export type ClassAncestry = Map<string, string>;

export const extractCssClassAncestry = (cssContent: string): ClassAncestry => {
  const { isFileIgnored, ignoredLines } = parseIgnoreComments(cssContent);

  const ancestry: ClassAncestry = new Map();

  if (isFileIgnored) {
    return ancestry;
  }

  const root = postcssScss.parse(cssContent);

  root.walkRules((rule) => {
    if (rule.source?.start && ignoredLines.has(rule.source.start.line)) {
      return;
    }

    // Only suffix-`&` rules (`&-x`, `&Camel`) can produce a concatenation
    // child. `&.x`, `& .x`, `&:hover`, and selectors without `&` cannot.
    if (!SUFFIX_AMPERSAND_REGEX.test(rule.selector)) {
      return;
    }

    const parentClassName = getParentClassName(rule);
    if (!parentClassName) {
      return;
    }

    // Process each comma-separated selector independently so a sibling in the
    // same selector list is not mistaken for a concatenation child. In
    // `.button { &Black, .buttonLegacy { … } }` only the `&Black` segment is a
    // suffix concatenation of the parent; `.buttonLegacy` must not be linked
    // even though it shares the `button` prefix.
    for (const segment of rule.selector.split(',')) {
      if (!SUFFIX_AMPERSAND_REGEX.test(segment)) {
        continue;
      }

      const resolved = resolveAmpersandSelector(segment, parentClassName);
      for (const className of extractClassNamesFromSelector(resolved)) {
        // The concatenation child is the parent name plus a non-empty suffix
        // (excludes the parent itself and `&.--modifier` compounds, which
        // resolve to a standalone class that does not extend the parent).
        if (
          className !== parentClassName &&
          className.startsWith(parentClassName)
        ) {
          ancestry.set(className, parentClassName);
        }
      }
    }
  });

  // A class removed because it is `composes:`-d from elsewhere is not a real
  // family member here, so it must not be able to rescue a parent.
  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    ancestry.delete(composedClassName);
  }

  return ancestry;
};
