import type { Rule } from 'postcss';

/**
 * Builds the new `rule.selector` string after removing every selector in
 * `deadSelectors` from the rule's selector list. Returns `null` when the
 * result would be empty — callers MUST then call `rule.remove()` instead
 * of assigning the selector.
 *
 * Matching is based on the trimmed string equality of each entry in
 * `rule.selectors`, so dead-selector detection is done in caller-land by
 * feeding the same `rule.selectors[i]` values (PostCSS returns them already
 * trimmed and comma-split).
 *
 * This function does NOT mutate the rule — it only returns what the new
 * value should be. Separation keeps the function pure and easy to test.
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

  // Preserve the original delimiter where possible. PostCSS splits on
  // commas and drops trailing whitespace; reassembling with ", " matches
  // the convention printed by postcss-scss for multi-selector rules and
  // keeps the body of the rule byte-identical because only the selector
  // header is rewritten.
  return survivors.join(', ');
};
