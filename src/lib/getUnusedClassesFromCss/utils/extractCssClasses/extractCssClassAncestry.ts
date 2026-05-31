import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import { extractClassNamesFromRule } from './utils/extractClassNamesFromRule.js';
import { extractComposedClasses } from './utils/extractComposedClasses.js';
import {
  getParentClassName,
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

    for (const className of extractClassNamesFromRule(rule)) {
      // A genuine suffix concatenation is the parent name plus a non-empty
      // suffix. This excludes the parent itself and any class that does not
      // structurally extend the parent (e.g. a `&.--reversed` modifier).
      if (
        className !== parentClassName &&
        className.startsWith(parentClassName)
      ) {
        ancestry.set(className, parentClassName);
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
