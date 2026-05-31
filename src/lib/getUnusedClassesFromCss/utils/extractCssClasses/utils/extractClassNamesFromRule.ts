import { createParser, type Parser } from 'css-selector-parser';
import type { AtRule, Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';
import {
  getParentClassName,
  resolveAmpersandSelector,
} from './resolveAmpersandSelector.js';

/**
 * Non-strict mode lets the parser accept identifiers that start with two
 * hyphens (e.g. `.--reversed`, `.root.--variant`) — a common CSS-Modules
 * modifier convention that strict mode rejects, which would otherwise make the
 * `catch` below silently drop the whole rule. Non-strict mode is also more
 * tolerant of truncated selectors, extracting the recognizable class names
 * instead of discarding the rule; for an unused-CSS analyzer, erring toward
 * "this class is used" is safer than losing a definition.
 */
const parseSelector: Parser = createParser({ strict: false });

/**
 * Resolve a raw selector string (already ampersand-resolved against its parent)
 * into the class names it defines. Returns an empty array if the selector
 * cannot be parsed at all.
 */
const extractClassNamesFromSelector = (selector: string): string[] => {
  try {
    const processedSelector = clearGlobalSelectors(selector);
    const parsed = parseSelector(processedSelector);

    if (Array.isArray(parsed)) {
      return parsed.flatMap(findClassNamesInSelector);
    }

    return findClassNamesInSelector(parsed);
  } catch {
    return [];
  }
};

export const extractClassNamesFromRule = (rule: Rule): string[] => {
  const parentClassName = getParentClassName(rule);
  const resolved = resolveAmpersandSelector(rule.selector, parentClassName);

  return extractClassNamesFromSelector(resolved);
};

/**
 * Extract class names from a selector-bearing custom at-rule, e.g.
 * `@responsive .item[style*="…"] { … }`. PostCSS parses such an at-rule with
 * the selector held in `params` (and declarations directly inside the at-rule,
 * with no inner rule node), so `walkRules` never sees it. Here we treat the
 * at-rule's `params` as the selector. The caller is responsible for only
 * passing at-rules whose params are a selector (not a media/supports-style
 * condition); a params string with no class token yields an empty array.
 */
export const extractClassNamesFromAtRule = (atRule: AtRule): string[] =>
  extractClassNamesFromSelector(atRule.params);
