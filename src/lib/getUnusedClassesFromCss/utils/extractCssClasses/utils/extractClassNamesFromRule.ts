import type { AtRule, Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';
import {
  getParentClassName,
  resolveAmpersandSelector,
} from './resolveAmpersandSelector.js';
import { parseSelector } from './selectorParser.js';

/**
 * Resolve a raw selector string (already ampersand-resolved against its parent)
 * into the class names it defines. Returns an empty array if the selector
 * cannot be parsed at all.
 */
export const extractClassNamesFromSelector = (selector: string): string[] => {
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
 * `@at-root (with: rule) .foo` / `(without: media) .foo` prefix the selector
 * with a query group the selector parser can't read. Strip it so the real
 * selector (`.foo`) is parsed; queries don't nest parens, so `[^)]*` suffices.
 */
const stripAtRootQuery = (params: string): string =>
  params.replace(/^\s*\(\s*(?:with|without)\s*:[^)]*\)\s*/i, '');

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
  extractClassNamesFromSelector(
    atRule.name.toLowerCase() === 'at-root'
      ? stripAtRootQuery(atRule.params)
      : atRule.params
  );
