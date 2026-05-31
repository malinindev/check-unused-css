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
 * Maps a child class to its immediate parent, for SCSS suffix concatenation
 * only: `.--orientation { &-horizontal {} }` → `--orientation-horizontal →
 * --orientation`, `.button { &Black {} }` → `buttonBlack → button`. Multi-level
 * nesting stores one hop per level; walk the map to get the full chain.
 *
 * Descendant nesting (`& .child`) and compound modifiers (`&.--reversed`) are
 * not concatenation, so they are not recorded.
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

    // Handle each selector in the list separately, so a sibling like
    // `.buttonLegacy` in `.button { &Black, .buttonLegacy {} }` isn't taken for
    // a child just because it shares the `button` prefix.
    for (const segment of rule.selector.split(',')) {
      if (!SUFFIX_AMPERSAND_REGEX.test(segment)) {
        continue;
      }

      const resolved = resolveAmpersandSelector(segment, parentClassName);
      for (const className of extractClassNamesFromSelector(resolved)) {
        // A real child is the parent name plus a suffix (excludes the parent
        // itself and `&.--modifier` compounds that don't extend it).
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
