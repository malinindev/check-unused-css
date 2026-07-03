import type { AstSelector } from 'css-selector-parser';
import type { AtRule, Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import {
  findClassNamesInSelector,
  findLocalRescopedClassNames,
} from './findClassNamesInSelector.js';
import {
  getParentClassName,
  resolveAmpersandSelector,
} from './resolveAmpersandSelector.js';
import { parseSelector } from './selectorParser.js';

/**
 * Parse a raw selector string (already ampersand-resolved against its parent)
 * and reduce it to class names with `collect`. Returns an empty array if the
 * selector cannot be parsed at all.
 */
const extractWith = (
  selector: string,
  collect: (parsed: AstSelector) => string[]
): string[] => {
  try {
    const processedSelector = clearGlobalSelectors(selector);
    const parsed = parseSelector(processedSelector);

    if (Array.isArray(parsed)) {
      return parsed.flatMap(collect);
    }

    return collect(parsed);
  } catch {
    return [];
  }
};

/**
 * Resolve a raw selector string into the class names it defines. Returns an
 * empty array if the selector cannot be parsed at all.
 */
export const extractClassNamesFromSelector = (selector: string): string[] =>
  extractWith(selector, findClassNamesInSelector);

/**
 * Resolve a raw selector string into ONLY the classes it re-scopes to local via
 * a `:local(...)` function form. For rules whose inherited scope is global
 * (inside a bare `:global` block): plain classes there are global, but a
 * `:local(.foo)` form flips `.foo` back to local (issue #101).
 */
export const extractLocalRescopedClassNamesFromSelector = (
  selector: string
): string[] => extractWith(selector, findLocalRescopedClassNames);

export const extractClassNamesFromRule = (rule: Rule): string[] => {
  const parentClassName = getParentClassName(rule);
  const resolved = resolveAmpersandSelector(rule.selector, parentClassName);

  return extractClassNamesFromSelector(resolved);
};

/**
 * Like {@link extractClassNamesFromRule} but for a rule whose inherited scope is
 * global: only `:local(...)`-re-scoped classes are returned (issue #101).
 */
export const extractLocalRescopedClassNamesFromRule = (
  rule: Rule
): string[] => {
  const parentClassName = getParentClassName(rule);
  const resolved = resolveAmpersandSelector(rule.selector, parentClassName);

  return extractLocalRescopedClassNamesFromSelector(resolved);
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
