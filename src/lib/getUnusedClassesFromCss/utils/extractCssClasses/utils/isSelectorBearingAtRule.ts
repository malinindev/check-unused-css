import type { AtRule } from 'postcss';

// Matches a CSS class token, including the `.--modifier` double-dash convention.
// Used to confirm the params actually define a class rather than merely
// containing a stray `.` (e.g. a decimal in `(min-width: 1.5rem)` or a URL).
const CLASS_TOKEN_PATTERN = /\.[-_a-zA-Z]/;

/**
 * Standard at-rules whose `params` are NOT a selector. Some take a condition
 * (`@media (min-width: …)`, `@supports (display: grid)`, `@container`), some an
 * identifier/keyframe-name (`@keyframes spin`, `@layer base`), some nothing or a
 * URL (`@font-face`, `@page`, `@property`, `@import`, `@charset`). A class token
 * appearing inside their params (e.g. a selector list under `@scope (.a) to (.b)`)
 * is part of a condition, not a class definition, so we never treat these as
 * selector-bearing. Custom CSS-Modules `@value` is excluded for the same reason.
 */
const NON_SELECTOR_AT_RULES = new Set([
  'media',
  'supports',
  'container',
  'layer',
  'scope',
  'keyframes',
  'font-face',
  'page',
  'property',
  'counter-style',
  'font-feature-values',
  'import',
  'charset',
  'namespace',
  'document',
  'value',
]);

/**
 * Whether an at-rule's direct children include a `@value` BLOCK. Such an at-rule
 * is a responsive-value container (e.g. `@responsive .--size { @value small { … } }`):
 * its selector is a TEMPLATE expanded at build time into `--size-small` etc.,
 * never referenced literally as `s['--size']` (source reaches it via helpers
 * like `responsiveClassNames(s, '--size', value)`). Extracting the template name
 * as a class would produce a false "unused" finding, so these are skipped.
 * Any real classes nested deeper (e.g. `&.--visibility` inside a `@value` block)
 * are still picked up by the normal rule walk.
 *
 * Only block-form `@value` (with a `{ … }` body, i.e. a `nodes` array) signals a
 * template container. Statement-form `@value foo: 1;` is a CSS-Modules variable
 * declaration and must NOT cause the selector to be skipped.
 */
const containsValueBlocks = (atRule: AtRule): boolean =>
  (atRule.nodes ?? []).some(
    (node) =>
      node.type === 'atrule' &&
      node.name.toLowerCase() === 'value' &&
      node.nodes !== undefined
  );

/**
 * Whether an at-rule's `params` should be treated as a CSS selector defining
 * classes. True for custom at-rules (e.g. `@responsive .item[style*="…"]`)
 * whose params contain a class token and whose body is a direct style block;
 * false for standard condition/identifier at-rules, params with no class token
 * (e.g. `@responsive (min-width: 1px)`), and responsive-value containers whose
 * selector is a build-time template (e.g. `@responsive .--size { @value … }`).
 */
export const isSelectorBearingAtRule = (atRule: AtRule): boolean => {
  if (NON_SELECTOR_AT_RULES.has(atRule.name.toLowerCase())) {
    return false;
  }

  // An actual class token is required for the params to define a class. A bare
  // `.includes('.')` is too broad — it matches condition wrappers with decimals
  // or URLs (e.g. `@responsive (min-width: 1.5rem)`), so match a real class
  // token instead. This also filters out condition-only custom at-rules, which
  // invent no class names.
  if (!CLASS_TOKEN_PATTERN.test(atRule.params)) {
    return false;
  }

  return !containsValueBlocks(atRule);
};
