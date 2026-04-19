import type { Rule } from 'postcss';

/**
 * Returns the new `rule.selector` string after dropping every entry in
 * `deadSelectors`. Returns `null` when nothing would survive — callers MUST
 * then call `rule.remove()` instead of assigning the selector.
 * Matching is trimmed string equality against PostCSS's pre-split
 * `rule.selectors`.
 */
export const stripSelectorsFromList = (
  rule: Rule,
  deadSelectors: string[]
): string | null => {
  const deadSet = new Set(deadSelectors.map((s) => s.trim()));

  const survivors = rule.selectors
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !deadSet.has(s));

  if (survivors.length === 0) return null;

  // ", " matches postcss-scss output so only the selector header changes,
  // not the rule body.
  return survivors.join(', ');
};
